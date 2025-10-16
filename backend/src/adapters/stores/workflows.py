from contextvars import Context
from typing import Any, Iterable

from clickhouse_connect.driver import Client

from src.domain import entities

stdList = list


def _filt_to_sql(filters: Iterable[entities.StoreFilter]) -> tuple[str, dict[str, Any]]:
    params = {}
    q = ""
    for filt in filters:
        match filt.op:
            case "like":
                filt.value = f"%{filt.value}%"
            case "like_start":
                filt.op = "like"
                filt.value = f"{filt.value}%"

        q += f" {filt.field_name or filt.key} {filt.op} %({filt.key}){filt.type_mapper} AND"
        params[filt.key] = filt.value

    return q, params


class NoResultFound(Exception):
    pass


class Flows:
    def __init__(self, client: Client):
        self.__client = client

    def one(self, ctx: Context, name: str, trace: str) -> entities.Flow:
        query = """SELECT
                 name, description, labels, trace_id, service_name,
                 status, status_message, created_at, ended_at, duration
                 FROM dashfrog.flows WHERE name = %(name)s AND trace_id = %(trace)s
                LIMIT 1"""

        results = self.__client.query(query, parameters={"name": name, "trace": trace})

        for row in results.named_results():
            return entities.Flow(**row)

        raise NoResultFound()

    def list(
        self,
        ctx: Context,
        *filters: entities.StoreFilter,
        limit: int | None = None,
        offset: int | None = None,
        order_by: entities.StoreOrder = entities.StoreOrder(),
    ) -> tuple[list[entities.Flow], int]:
        query = """SELECT
                 name, description, labels, trace_id, service_name,
                 status, status_message, created_at, ended_at, duration
                 FROM dashfrog.flows"""

        count_based_query = "SELECT COUNT(*) as count FROM dashfrog.flows"

        if not order_by:
            order_by = entities.StoreOrder(
                [
                    entities.StoreOrderClause(key="created_at", order="DESC", nulls_first=True),
                    entities.StoreOrderClause(key="created_at", order="DESC"),
                ]
            )

        filt_query, params = _filt_to_sql(filters)
        if filt_query:
            query += "\nWHERE " + filt_query.strip(" AND")
            count_based_query += "\nWHERE " + filt_query.strip(" AND")

        query += order_by.to_sql()

        if limit:
            query += f"\nLIMIT {limit}"
        if offset:
            query += f"\nOFFSET {offset}"

        results = self.__client.query(query, parameters=params)

        res = []
        for row in results.named_results():
            res.append(entities.Flow(**row))

        count = len(res)

        if limit or offset:
            count_res = self.__client.query(count_based_query, parameters=params)
            for row in count_res.named_results():
                count = row["count"]
                break

        return res, count

    def get_latest_flows(
        self,
        ctx: Context,
        *filters: entities.StoreFilter,
        order_by: entities.StoreOrder | None = None,
    ) -> stdList[entities.Flow]:
        order_by = order_by or entities.StoreOrder()

        query = """SELECT
            name, service_name, labels,
            argMax(trace_id, coalesce(flows.ended_at, flows.created_at)) as trace_id,
            argMax(description, coalesce(flows.ended_at, flows.created_at)) as description,
            argMax(status, coalesce(flows.ended_at, flows.created_at)) as status,
            argMax(status_message, coalesce(flows.ended_at, flows.created_at)) as status_message,
            argMax(created_at, coalesce(flows.ended_at, flows.created_at)) as created_at,
            argMax(ended_at, coalesce(flows.ended_at, flows.created_at)) as ended_at,
            argMax(duration, coalesce(flows.ended_at, flows.created_at)) as duration
        FROM dashfrog.flows as flows
        GROUP BY name, service_name, labels"""

        filt_query, params = _filt_to_sql(filters)
        if filt_query:
            query += "\nHAVING " + filt_query.strip(" AND")

        order_by += [
            entities.StoreOrderClause(key="ended_at", order="DESC", nulls_first=True),
            entities.StoreOrderClause(key="created_at", order="DESC"),
        ]

        query += order_by.to_sql()

        results = self.__client.query(query, parameters=params)

        res = []
        for row in results.named_results():
            res.append(entities.Flow(**row))

        return res


class Steps:
    def __init__(self, client: Client):
        self.__client = client

    def get_for_flow(self, ctx: Context, flow_name: str, trace: str) -> list[entities.Step]:
        query = """SELECT
                id, for_flow, trace_id, parent_id,
                first_value(name) as name,
                argMax(description, coalesce(step_events.ended_at, step_events.created_at)) as description, 
                argMax(labels, coalesce(step_events.ended_at, step_events.created_at)) as labels, 
                argMax(status, coalesce(step_events.ended_at, step_events.created_at))  as status,
                argMax(status_message, coalesce(step_events.ended_at, step_events.created_at)) as status_message    ,
                argMax(duration, coalesce(step_events.ended_at, step_events.created_at)) as duration,
                min(created_at) as created_at,
                min(started_at) as started_at,
                max(ended_at) as ended_at
        FROM dashfrog.step_events
        WHERE for_flow = %(for_flow)s AND trace_id = %(trace)s
        GROUP BY id, for_flow, trace_id, parent_id
        ORDER BY parent_id NULLS FIRST, created_at"""

        results = self.__client.query(query, parameters={"for_flow": flow_name, "trace": trace})

        known_steps = {}
        res = {}
        awaited_steps = {}
        for row in results.named_results():
            step = entities.Step(**row)
            if not step.duration and step.started_at and step.ended_at:
                step.duration = int((step.ended_at - step.started_at).total_seconds() * 1000)

            known_steps[row["id"]] = step
            if not row["parent_id"]:
                res[row["id"]] = step
            elif row["parent_id"] in known_steps:
                known_steps[row["parent_id"]].children.append(step)
            else:
                awaited_steps[row["parent_id"]] = step

        for parent, step in awaited_steps.items():
            if parent not in known_steps:
                raise ValueError(f"Unknown parent step ! {parent} -> {step}")

            known_steps[parent].children.append(step)

        return list(res.values())
