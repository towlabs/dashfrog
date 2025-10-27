from datetime import datetime

from fastapi import APIRouter, Depends

from api.paginate.typing import Page, Pagination
from api.payloads import FilterParams, ResponsesDefinition
from workflows import Flow, Step, Workflows

ep = APIRouter(prefix="/flows", tags=["flows"])


@ep.get(
    "/",
    response_model=list[Flow],
    responses=ResponsesDefinition().build(),
)
@ep.post("/", response_model=list[Flow], responses=ResponsesDefinition().build())
def list_flows(
    from_date: str | None = None,
    to_date: str | None = None,
    filters: FilterParams = FilterParams(),
):
    from_date_ts = datetime.fromisoformat(from_date) if from_date else None
    to_date_ts = datetime.fromisoformat(to_date) if to_date else None

    flows = Workflows().list_flows(
        filters.from_date or from_date_ts,
        filters.to_date or to_date_ts,
        order_by=filters.get_orders(),
        filters=filters.get_filters(with_times=True),
    )

    return flows


@ep.get(
    "/latest",
    response_model=list[Flow],
    responses=ResponsesDefinition().build(),
)
@ep.post(
    "/latest",
    response_model=list[Flow],
    responses=ResponsesDefinition().build(),
)
def latest_flows(
    from_date: str | None = None,
    to_date: str | None = None,
    filters: FilterParams = FilterParams(),
):
    from_date_ts = datetime.fromisoformat(from_date) if from_date else None
    to_date_ts = datetime.fromisoformat(to_date) if to_date else None

    flows = Workflows().get_latest_flow_runs(
        from_date_ts,
        to_date_ts,
        filters=filters.get_filters(with_times=True),
    )

    return flows


@ep.get(
    "/{name}",
    response_model=Page[Flow],
    responses=ResponsesDefinition().build(),
)
@ep.post(
    "/{name}",
    response_model=Page[Flow],
    responses=ResponsesDefinition().build(),
)
def history(
    name: str,
    filters: FilterParams = FilterParams(),
    paginate: Pagination = Depends(),
):
    raw_pagination = paginate.to_raw_params()

    flows, qty = Workflows().get_single_history(
        name,
        raw_pagination.limit,
        raw_pagination.offset,
        filters.get_filters(with_times=True),
        filters.get_orders(),
    )

    return Page[Flow].create(flows, qty, paginate)


@ep.get(
    "/{name}/{trace_id}",
    response_model=Flow,
    responses=ResponsesDefinition().build(),
)
def detail(name: str, trace_id: str):
    return Workflows().get_flow(name, trace_id)


@ep.get(
    "/{name}/{trace_id}/steps",
    response_model=list[Step],
    responses=ResponsesDefinition().build(),
)
def list_steps(name: str, trace_id: str):
    return Workflows().get_steps(name, trace_id)
