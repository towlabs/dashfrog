"""Flow API routes."""

from datetime import datetime
from itertools import groupby

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import and_, func, select
from sqlalchemy.engine.base import Connection

from dashfrog_python_sdk import get_dashfrog_instance
from dashfrog_python_sdk.constants import (
    BAGGAGE_STEP_LABEL_NAME,
    EVENT_FLOW_FAIL,
    EVENT_FLOW_START,
    EVENT_FLOW_SUCCESS,
    EVENT_STEP_FAIL,
    EVENT_STEP_START,
    EVENT_STEP_SUCCESS,
)
from dashfrog_python_sdk.models import FlowEvent

from .schemas import (
    FlowDetailResponse,
    FlowHistory,
    FlowHistoryEvent,
    FlowHistoryStep,
    FlowResponse,
    Label,
    LabelFilter,
)

router = APIRouter(prefix="/flows", tags=["flows"])


def flow_generator(conn: Connection, base_filters: list):
    """Generate a flow summary query with stats and latest run info."""
    # CTE 1: flow_stats - aggregate statistics per flow
    flow_stats = (
        select(
            FlowEvent.labels["flow_name"].astext.label("name"),
            func.count(FlowEvent.flow_id).filter(FlowEvent.event_name == EVENT_FLOW_START).label("runCount"),
            func.count(FlowEvent.flow_id).filter(FlowEvent.event_name == EVENT_FLOW_SUCCESS).label("successCount"),
            func.count(FlowEvent.flow_id).filter(FlowEvent.event_name == EVENT_FLOW_FAIL).label("failedCount"),
            func.max(FlowEvent.event_dt).filter(FlowEvent.event_name == EVENT_FLOW_START).label("lastRunStartedAt"),
        )
        .where(and_(*base_filters))
        .group_by(FlowEvent.labels["flow_name"].astext)
    ).cte("flow_stats")

    # CTE 2: latest_run - most recent event per flow name
    latest_run = (
        select(
            FlowEvent.labels["flow_name"].astext.label("name"),
            FlowEvent.event_name.label("lastRunEventType"),
            FlowEvent.labels,
            FlowEvent.event_dt.label("lastRunEventDt"),
        )
        .where(and_(*base_filters))
        .distinct(FlowEvent.labels["flow_name"].astext)
        .order_by(
            FlowEvent.labels["flow_name"].astext,
            FlowEvent.event_dt.desc(),
        )
    ).cte("latest_run")

    # Main query: join all CTEs
    query = (
        select(
            flow_stats.c.name,
            flow_stats.c.runCount,
            flow_stats.c.successCount,
            flow_stats.c.failedCount,
            flow_stats.c.lastRunStartedAt,
            latest_run.c.labels,
            latest_run.c.lastRunEventType,
            latest_run.c.lastRunEventDt,
        )
        .select_from(flow_stats)
        .join(latest_run, flow_stats.c.name == latest_run.c.name)
    )

    result = conn.execute(query)
    for name, runCount, successCount, failedCount, lastRunStartedAt, labels, lastRunEventType, lastRunEventDt in result:
        yield FlowResponse(
            name=name,
            labels=labels,
            lastRunStatus="success"
            if lastRunEventType == EVENT_FLOW_SUCCESS
            else "failure"
            if lastRunEventType == EVENT_FLOW_FAIL
            else "running",
            lastRunStartedAt=lastRunStartedAt,
            lastRunEndedAt=None if lastRunEventType == EVENT_FLOW_START else lastRunEventDt,
            runCount=runCount,
            successCount=successCount,
            pendingCount=runCount - successCount - failedCount,
            failedCount=failedCount,
        )


class FlowSearchRequest(BaseModel):
    """Request body for searching/listing flows."""

    start_dt: datetime = Field(..., description="Start datetime for filtering flow events")
    end_dt: datetime = Field(..., description="End datetime for filtering flow events")
    labels: list[LabelFilter] = Field(default_factory=list, description="Label filters as key-value pairs")


class FlowDetailRequest(BaseModel):
    """Request body for getting flow details."""

    flow_name: str = Field(..., description="Name of the flow to get details for")
    start_dt: datetime = Field(..., description="Start datetime for filtering flow events")
    end_dt: datetime = Field(..., description="End datetime for filtering flow events")
    labels: list[LabelFilter] = Field(default_factory=list, description="Label filters as key-value pairs")


@router.post("/search", response_model=list[FlowResponse])
async def search_flows(request: FlowSearchRequest) -> list[FlowResponse]:
    """Search/list flows with optional label filters.

    Args:
        request: Search request containing datetime range and optional label filters

    Example request body:
        {
            "start_dt": "2024-01-01T00:00:00Z",
            "end_dt": "2024-01-31T23:59:59Z",
            "labels": [
                {"key": "tenant", "value": "acme-corp"},
                {"key": "environment", "value": "production"}
            ]
        }
    """
    dashfrog = get_dashfrog_instance()

    # Build base filter conditions (time range + labels)
    base_filters = [
        FlowEvent.event_dt >= request.start_dt,
        FlowEvent.event_dt <= request.end_dt,
    ]

    # Add label filters
    for label_filter in request.labels:
        base_filters.append(FlowEvent.labels[label_filter.key].astext == label_filter.value)

    with dashfrog.db_engine.connect() as conn:
        return list(flow_generator(conn, base_filters))


@router.post("/details", response_model=FlowDetailResponse)
async def get_flow_details(request: FlowDetailRequest) -> FlowDetailResponse:
    """Get detailed flow information with run history.

    Args:
        request: Request containing flow name, datetime range, and optional label filters

    Example request body:
        {
            "flow_name": "process_order",
            "start_dt": "2024-01-01T00:00:00Z",
            "end_dt": "2024-01-31T23:59:59Z",
            "labels": [
                {"key": "tenant", "value": "acme-corp"}
            ]
        }
    """
    dashfrog = get_dashfrog_instance()

    # Build base filter conditions (time range + labels + flow name)
    base_filters = [
        FlowEvent.event_dt >= request.start_dt,
        FlowEvent.event_dt <= request.end_dt,
        FlowEvent.labels["flow_name"].astext == request.flow_name,
    ]

    # Add label filters
    for label_filter in request.labels:
        base_filters.append(FlowEvent.labels[label_filter.key].astext == label_filter.value)

    # Get all flow runs with their events
    history_query = select(FlowEvent).where(and_(*base_filters)).order_by(FlowEvent.flow_id, FlowEvent.event_dt.asc())

    with dashfrog.db_engine.connect() as conn:
        # Get summary
        try:
            flow = next(flow_generator(conn, base_filters))
        except StopIteration:
            raise HTTPException(status_code=404, detail=f"Flow {request.flow_name} not found")

        # Get all events grouped by flow_id
        history_result = conn.execute(history_query).fetchall()

        flow_histories: list[FlowHistory] = []
        for flow_id, events_iter in groupby(history_result, key=lambda e: e.flow_id):
            events_list = list(events_iter)

            # Find start and end times
            try:
                start_event = next(e for e in events_list if e.event_name == EVENT_FLOW_START)
            except StopIteration:
                continue

            end_event = next(
                (e for e in events_list if e.event_name in [EVENT_FLOW_SUCCESS, EVENT_FLOW_FAIL]),
                None,
            )

            # Determine status
            if end_event:
                status = "success" if end_event.event_name == EVENT_FLOW_SUCCESS else "failure"
                end_time = end_event.event_dt
            else:
                status = "running"
                end_time = None

            # Build events list
            history_events = [
                FlowHistoryEvent(
                    eventName=e.event_name,
                    eventDt=e.event_dt,
                )
                for e in events_list
            ]

            # Build steps list from step events
            step_events = [e for e in events_list if e.event_name.startswith("step_")]
            steps: list[FlowHistoryStep] = []

            # Group step events by step_name
            for step_name, step_events_iter in groupby(
                step_events, key=lambda e: e.labels.get(BAGGAGE_STEP_LABEL_NAME, "")
            ):
                if not step_name:
                    continue

                step_events_list = list(step_events_iter)
                try:
                    step_start = next(e for e in step_events_list if e.event_name == EVENT_STEP_START)
                except StopIteration:
                    continue

                step_end = next(
                    (e for e in step_events_list if e.event_name in [EVENT_STEP_SUCCESS, EVENT_STEP_FAIL]),
                    None,
                )

                step_status, step_end_time = "running", None
                if step_end:
                    step_status = "success" if step_end.event_name == EVENT_STEP_SUCCESS else "failure"
                    step_end_time = step_end.event_dt

                steps.append(
                    FlowHistoryStep(
                        name=step_name,
                        startTime=step_start.event_dt,
                        endTime=step_end_time,
                        status=step_status,
                    )
                )

            flow_histories.append(
                FlowHistory(
                    flowId=flow_id,
                    startTime=start_event.event_dt,
                    endTime=end_time,
                    status=status,
                    events=history_events,
                    steps=steps,
                )
            )

        return FlowDetailResponse(
            name=flow.name,
            labels=flow.labels,
            lastRunStatus=flow.lastRunStatus,
            lastRunStartedAt=flow.lastRunStartedAt,
            lastRunEndedAt=flow.lastRunEndedAt,
            runCount=flow.runCount,
            successCount=flow.successCount,
            pendingCount=flow.pendingCount,
            failedCount=flow.failedCount,
            history=flow_histories,
        )


@router.get("/labels", response_model=list[Label])
async def get_all_flow_labels(
    start_dt: datetime = Query(..., description="Start datetime for filtering flow events"),
    end_dt: datetime = Query(..., description="End datetime for filtering flow events"),
) -> list[Label]:
    """Fetch all flow labels and their values from the database."""
    from sqlalchemy import text

    dashfrog = get_dashfrog_instance()

    with dashfrog.db_engine.connect() as conn:
        query = text("""
            SELECT kv.key AS label_key,
                kv.value AS label_value
            FROM flow_event,
                LATERAL jsonb_each_text(labels) AS kv(key, value)
            WHERE event_name = :event_name
            AND event_dt >= :start_dt
            AND event_dt <= :end_dt
            GROUP BY kv.key, kv.value
            ORDER BY kv.key
        """)
        result = groupby(
            conn.execute(query, {"event_name": EVENT_FLOW_START, "start_dt": start_dt, "end_dt": end_dt}).fetchall(),
            key=lambda x: x[0],
        )
        return [Label(label=label, values=sorted(v[1] for v in values)) for label, values in result]
