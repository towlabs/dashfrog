"""Flows API routes - consolidated from api/routes/flows.py and workflows/workflow.py."""

from __future__ import annotations

from collections.abc import Iterable
from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends

from api.paginate.typing import Page, Pagination
from api.payloads import FilterParams, ResponsesDefinition
from core.context import get_app
from core.stores import (
    StoreEqual,
    StoreFilter,
    StoreGreater,
    StoreLower,
    StoreOrder,
    StoreOrderClause,
)
from models.workflows import Flow, Step

router = APIRouter(prefix="/flows", tags=["flows"])


# Helper functions (formerly private methods in Workflows class)
def _list_flows(
    *filters: StoreFilter,
    limit: int | None = None,
    offset: int | None = None,
    order_by: StoreOrder = StoreOrder(),
) -> tuple[list[Flow], int]:
    """List flows from ClickHouse with optional filtering and pagination."""
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

    filt_query, params = _filt_to_sql(filters)
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


def _get_latest_flows(
    *filters: StoreFilter,
    order_by: StoreOrder | None = None,
) -> list[Flow]:
    """Get the latest flow runs for each flow name."""
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

    filt_query, params = _filt_to_sql(filters)
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


def _get_steps_for_flow(flow_name: str, trace: str) -> list[Step]:
    """Get all steps for a specific flow."""
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


def _filt_to_sql(filters: Iterable[StoreFilter]) -> tuple[str, dict[str, Any]]:
    """Convert store filters to SQL WHERE clause."""
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
    """Exception raised when no result is found."""

    pass


# API Routes
@router.get(
    "/",
    response_model=list[Flow],
    responses=ResponsesDefinition().build(),
)
@router.post("/", response_model=list[Flow], responses=ResponsesDefinition().build())
def list_flows(
    from_date: str | None = None,
    to_date: str | None = None,
    filters: FilterParams = FilterParams(),
):
    """List all flows with optional date range and filters."""
    logger = get_app().log("workflows")
    from_date_ts = datetime.fromisoformat(from_date) if from_date else None
    to_date_ts = datetime.fromisoformat(to_date) if to_date else None

    log = logger.bind(action="list_flows", from_date=from_date_ts, to_date=to_date_ts)

    try:
        filter_list = filters.get_filters(with_times=True)
        order_by = filters.get_orders()

        if filters.from_date or from_date_ts:
            filter_list.append(StoreGreater("created_at", filters.from_date or from_date_ts))

        if filters.to_date or to_date_ts:
            filter_list.append(StoreLower("created_at", filters.to_date or to_date_ts))

        flows, _ = _list_flows(*filter_list, order_by=order_by)

        log.debug("Success !")
        return flows
    except Exception as e:
        log.error("Failed to list flows", error=str(e))
        raise


@router.get(
    "/latest",
    response_model=list[Flow],
    responses=ResponsesDefinition().build(),
)
@router.post(
    "/latest",
    response_model=list[Flow],
    responses=ResponsesDefinition().build(),
)
def latest_flows(
    from_date: str | None = None,
    to_date: str | None = None,
    filters: FilterParams = FilterParams(),
):
    """Get the latest flow run for each unique flow."""
    logger = get_app().log("workflows")
    from_date_ts = datetime.fromisoformat(from_date) if from_date else None
    to_date_ts = datetime.fromisoformat(to_date) if to_date else None

    log = logger.bind(action="get_latest_flow_runs", from_date=from_date_ts, to_date=to_date_ts)

    try:
        filter_list = filters.get_filters(with_times=True)

        if from_date_ts:
            filter_list.append(StoreGreater("created_at", from_date_ts))

        if to_date_ts:
            filter_list.append(StoreLower("created_at", to_date_ts))

        flows = _get_latest_flows(*filter_list)

        log.debug("Success !")
        return flows
    except Exception as e:
        log.error("Failed to get latest flow runs", error=str(e))
        raise


@router.get(
    "/{name}",
    response_model=Page[Flow],
    responses=ResponsesDefinition().build(),
)
@router.post(
    "/{name}",
    response_model=Page[Flow],
    responses=ResponsesDefinition().build(),
)
def history(
    name: str,
    filters: FilterParams = FilterParams(),
    paginate: Pagination = Depends(),
):
    """Get the execution history for a specific flow by name."""
    logger = get_app().log("workflows")
    log = logger.bind(action="get_single_history", flow_name=name)

    try:
        raw_pagination = paginate.to_raw_params()
        filter_list = filters.get_filters(with_times=True)
        filter_list.append(StoreEqual("name", name))

        flows, qty = _list_flows(
            *filter_list,
            limit=raw_pagination.limit,
            offset=raw_pagination.offset,
            order_by=filters.get_orders(),
        )

        log.debug("Success !")
        return Page[Flow].create(flows, qty, paginate)
    except Exception as e:
        log.error("Failed to get single history", flow_name=name, error=str(e))
        raise


@router.get(
    "/{name}/{trace_id}",
    response_model=Flow,
    responses=ResponsesDefinition().build(),
)
def detail(name: str, trace_id: str):
    """Get detailed information for a specific flow execution."""
    logger = get_app().log("workflows")
    log = logger.bind(action="get_flow", flow_name=name, trace_id=trace_id)

    try:
        query = """SELECT
                 name, description, labels, trace_id, service_name,
                 status, status_message, created_at, ended_at, duration
                 FROM dashfrog.flows WHERE name = %(name)s AND trace_id = %(trace)s
                LIMIT 1"""

        results = get_app().clickhouse_client.query(query, parameters={"name": name, "trace": trace_id})

        for row in results.named_results():
            result = Flow(**row)
            log.debug("Success !")
            return result

        raise NoResultFound()
    except NoResultFound:
        raise
    except Exception as e:
        log.error("Failed to get flow", flow_name=name, trace_id=trace_id, error=str(e))
        raise


@router.get(
    "/{name}/{trace_id}/steps",
    response_model=list[Step],
    responses=ResponsesDefinition().build(),
)
def list_steps(name: str, trace_id: str):
    """Get all steps for a specific flow execution."""
    logger = get_app().log("workflows")
    log = logger.bind(action="get_steps", flow_name=name, trace_id=trace_id)

    try:
        steps = _get_steps_for_flow(name, trace_id)

        log.debug("Success !")
        return steps
    except Exception as e:
        log.error("Failed to get steps", flow_name=name, trace_id=trace_id, error=str(e))
        raise
