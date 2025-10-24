from __future__ import annotations

from collections.abc import Iterable
from datetime import datetime
from typing import Any

from core.context import get_app
from core.stores import StoreEqual, StoreFilter, StoreGreater, StoreLower, StoreOrder, StoreOrderClause

from .entities import Flow, Step
from .exceptions import NoResultFound


class Workflows:
    def __init__(self):
        self.logger = get_app().log("workflows")

    # Flow operations
    def list_flows(
        self,
        from_date: datetime | None = None,
        to_date: datetime | None = None,
        order_by: StoreOrder | None = None,
        filters: list[StoreFilter] | None = None,
    ) -> list[Flow]:
        filters = filters or []
        order_by = order_by or StoreOrder()
        log = self.logger.bind(action="list_flows", from_date=from_date, to_date=to_date)

        try:
            if from_date:
                filters.append(StoreGreater("created_at", from_date))

            if to_date:
                filters.append(StoreLower("created_at", to_date))

            flows, _ = self.__list_flows(*filters, order_by=order_by)

            log.debug("Success !")
            return flows
        except Exception as e:
            log.error("Failed to list flows", error=str(e))
            raise

    def get_latest_flow_runs(
        self,
        from_date: datetime | None = None,
        to_date: datetime | None = None,
        filters: list[StoreFilter] | None = None,
    ) -> list[Flow]:
        log = self.logger.bind(action="get_latest_flow_runs", from_date=from_date, to_date=to_date)
        filters = filters or []

        try:
            if from_date:
                filters.append(StoreGreater("created_at", from_date))

            if to_date:
                filters.append(StoreLower("created_at", to_date))

            flows = self.__get_latest_flows(*filters)

            log.debug("Success !")
            return flows
        except Exception as e:
            log.error("Failed to get latest flow runs", error=str(e))
            raise

    def get_single_history(
        self,
        flow_name: str,
        limit: int,
        offset: int,
        filters: list[StoreFilter] = None,
        orders: StoreOrder = None,
    ) -> tuple[list[Flow], int]:
        log = self.logger.bind(action="get_single_history", flow_name=flow_name)

        try:
            filters = filters or []
            filters.append(StoreEqual("name", flow_name))

            flows, nb_res = self.__list_flows(*filters, limit=limit, offset=offset, order_by=(orders or StoreOrder()))

            log.debug("Success !")
            return flows, nb_res
        except Exception as e:
            log.error("Failed to get single history", flow_name=flow_name, error=str(e))
            raise

    def get_flow(self, flow_name: str, trace_id: str) -> Flow:
        log = self.logger.bind(action="get_flow", flow_name=flow_name, trace_id=trace_id)

        try:
            query = """SELECT
                     name, description, labels, trace_id, service_name,
                     status, status_message, created_at, ended_at, duration
                     FROM dashfrog.flows WHERE name = %(name)s AND trace_id = %(trace)s
                    LIMIT 1"""

            results = get_app().clickhouse_client.query(query, parameters={"name": flow_name, "trace": trace_id})

            for row in results.named_results():
                result = Flow(**row)
                log.debug("Success !")
                return result

            raise NoResultFound()
        except NoResultFound:
            raise
        except Exception as e:
            log.error("Failed to get flow", flow_name=flow_name, trace_id=trace_id, error=str(e))
            raise

    # Step operations
    def get_steps(
        self,
        flow_name: str,
        trace_id: str,
    ) -> list[Step]:
        log = self.logger.bind(action="get_steps", flow_name=flow_name, trace_id=trace_id)

        try:
            steps = self.__get_steps_for_flow(flow_name, trace_id)

            log.debug("Success !")
            return steps
        except Exception as e:
            log.error("Failed to get steps", flow_name=flow_name, trace_id=trace_id, error=str(e))
            raise

    # Private methods (former store logic)
    def __list_flows(
        self,
        *filters: StoreFilter,
        limit: int | None = None,
        offset: int | None = None,
        order_by: StoreOrder = StoreOrder(),
    ) -> tuple[list[Flow], int]:
        query = """SELECT
                 name, description, labels, trace_id, service_name,
                 status, status_message, created_at, ended_at, duration
                 FROM dashfrog.flows"""

        count_based_query = "SELECT COUNT(*) as count FROM dashfrog.flows"

        if not order_by:
            order_by = StoreOrder(
                [
                    StoreOrderClause(key="created_at", order="DESC", nulls_first=True),
                    StoreOrderClause(key="created_at", order="DESC"),
                ]
            )

        filt_query, params = self.__filt_to_sql(filters)
        if filt_query:
            query += "\nWHERE " + filt_query.strip(" AND")
            count_based_query += "\nWHERE " + filt_query.strip(" AND")

        query += order_by.to_sql()

        if limit:
            query += f"\nLIMIT {limit}"
        if offset:
            query += f"\nOFFSET {offset}"

        results = get_app().clickhouse_client.query(query, parameters=params)

        res = []
        for row in results.named_results():
            res.append(Flow(**row))

        count = len(res)

        if limit or offset:
            count_res = get_app().clickhouse_client.query(count_based_query, parameters=params)
            for row in count_res.named_results():
                count = row["count"]
                break

        return res, count

    def __get_latest_flows(
        self,
        *filters: StoreFilter,
        order_by: StoreOrder | None = None,
    ) -> list[Flow]:
        order_by = order_by or StoreOrder()

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

        filt_query, params = self.__filt_to_sql(filters)
        if filt_query:
            query += "\nHAVING " + filt_query.strip(" AND")

        order_by += [
            StoreOrderClause(key="ended_at", order="DESC", nulls_first=True),
            StoreOrderClause(key="created_at", order="DESC"),
        ]

        query += order_by.to_sql()

        results = get_app().clickhouse_client.query(query, parameters=params)

        res = []
        for row in results.named_results():
            res.append(Flow(**row))

        return res

    def __get_steps_for_flow(self, flow_name: str, trace: str) -> list[Step]:
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

        results = get_app().clickhouse_client.query(query, parameters={"for_flow": flow_name, "trace": trace})

        known_steps = {}
        res = {}
        awaited_steps = {}
        for row in results.named_results():
            step = Step(**row)
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

    def __filt_to_sql(self, filters: Iterable[StoreFilter]) -> tuple[str, dict[str, Any]]:
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
