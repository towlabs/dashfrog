"""Flow API routes."""

from datetime import datetime, timedelta
from itertools import groupby
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials
from pydantic import BaseModel, Field
from sqlalchemy import and_, func, or_, select
from sqlalchemy.exc import NoResultFound
from sqlalchemy.orm import Session

from dashfrog_python_sdk import get_dashfrog_instance
from .auth import security, verify_has_access_to_notebook, verify_token
from dashfrog_python_sdk.constants import (
    BAGGAGE_FLOW_LABEL_NAME,
    BAGGAGE_STEP_LABEL_NAME,
    DEFAULT_THRESHOLD_DAYS,
    EVENT_FLOW_FAIL,
    EVENT_FLOW_START,
    EVENT_FLOW_SUCCESS,
    EVENT_STEP_FAIL,
    EVENT_STEP_START,
    EVENT_STEP_SUCCESS,
)
from dashfrog_python_sdk.models import Flow, FlowEvent, Notebook

from .schemas import (
    BlockFilters,
    FlowHistory,
    FlowHistoryEvent,
    FlowHistoryStep,
    FlowResponse,
    Label,
    LabelFilter,
)

router = APIRouter(prefix="/api/flows", tags=["flows"])


def flow_generator(session: Session, base_filters: list):
    """Generate a flow summary query with stats and latest run info."""
    # CTE 1: flow_stats - aggregate metrics per flow
    flow_stats = (
        select(
            FlowEvent.group_id,
            func.count(FlowEvent.flow_id).filter(FlowEvent.event_name == EVENT_FLOW_START).label("runCount"),
            func.count(FlowEvent.flow_id).filter(FlowEvent.event_name == EVENT_FLOW_SUCCESS).label("successCount"),
            func.count(FlowEvent.flow_id).filter(FlowEvent.event_name == EVENT_FLOW_FAIL).label("failedCount"),
            func.max(FlowEvent.event_dt).filter(FlowEvent.event_name == EVENT_FLOW_START).label("lastRunStartedAt"),
        )
        .where(and_(*base_filters))
        .group_by(FlowEvent.group_id)
    ).cte("flow_stats")

    # CTE 2: latest_run - most recent event per flow name
    latest_run = (
        select(
            FlowEvent.group_id,
            FlowEvent.event_name.label("lastRunEventType"),
            FlowEvent.labels,
            FlowEvent.flow_metadata.label("lastRunFlowMetadata"),
            FlowEvent.event_dt.label("lastRunEventDt"),
        )
        .where(and_(*base_filters))
        .distinct(FlowEvent.group_id)
        .order_by(
            FlowEvent.group_id,
            FlowEvent.event_dt.desc(),
        )
    ).cte("latest_run")

    # ct3: start and end times for each flow_id
    flow_start_end_subquery = (
        select(
            FlowEvent.flow_id,
            FlowEvent.group_id,
            func.min(FlowEvent.event_dt).filter(FlowEvent.event_name == EVENT_FLOW_START).label("startTime"),
            func.max(FlowEvent.event_dt)
            .filter(FlowEvent.event_name.in_([EVENT_FLOW_SUCCESS, EVENT_FLOW_FAIL]))
            .label("endTime"),
        )
        .where(and_(*base_filters))
        .group_by(FlowEvent.flow_id, FlowEvent.group_id)
    ).subquery()
    flow_duration_cte = (
        select(
            flow_start_end_subquery.c.group_id,
            func.avg(flow_start_end_subquery.c.endTime - flow_start_end_subquery.c.startTime).label("avgDuration"),
            func.max(flow_start_end_subquery.c.endTime - flow_start_end_subquery.c.startTime).label("maxDuration"),
            func.min(flow_start_end_subquery.c.endTime - flow_start_end_subquery.c.startTime).label("minDuration"),
        )
        .select_from(flow_start_end_subquery)
        .where(flow_start_end_subquery.c.endTime.isnot(None))
        .group_by(flow_start_end_subquery.c.group_id)
        .cte("flow_duration")
    )

    # Main query: join all CTEs
    query = (
        select(
            flow_stats.c.group_id,
            flow_stats.c.runCount,
            flow_stats.c.successCount,
            flow_stats.c.failedCount,
            flow_stats.c.lastRunStartedAt,
            latest_run.c.labels,
            latest_run.c.lastRunFlowMetadata,
            latest_run.c.lastRunEventType,
            latest_run.c.lastRunEventDt,
            flow_duration_cte.c.avgDuration,
            flow_duration_cte.c.maxDuration,
            flow_duration_cte.c.minDuration,
        )
        .select_from(flow_stats)
        .join(latest_run, flow_stats.c.group_id == latest_run.c.group_id)
        .join(flow_duration_cte, flow_stats.c.group_id == flow_duration_cte.c.group_id)
    )

    result = session.execute(query)
    for (
        group_id,
        runCount,
        successCount,
        failedCount,
        lastRunStartedAt,
        labels,
        lastRunFlowMetadata,
        lastRunEventType,
        lastRunEventDt,
        avgDuration,
        maxDuration,
        minDuration,
    ) in result:
        flow_name = lastRunFlowMetadata.get(BAGGAGE_FLOW_LABEL_NAME)
        lastRunEndedAt = None if lastRunEventType not in (EVENT_FLOW_SUCCESS, EVENT_FLOW_FAIL) else lastRunEventDt
        yield FlowResponse(
            groupId=group_id,
            name=flow_name,
            labels=labels,
            lastRunStatus="success"
            if lastRunEventType == EVENT_FLOW_SUCCESS
            else "failure"
            if lastRunEventType == EVENT_FLOW_FAIL
            else "running",
            lastRunStartedAt=lastRunStartedAt,
            lastRunEndedAt=lastRunEndedAt,
            runCount=runCount,
            successCount=successCount,
            pendingCount=runCount - successCount - failedCount,
            failedCount=failedCount,
            lastDurationInSeconds=(lastRunEndedAt - lastRunStartedAt).total_seconds()
            if lastRunEndedAt and lastRunStartedAt
            else None,
            avgDurationInSeconds=avgDuration.total_seconds() if avgDuration else None,
            maxDurationInSeconds=maxDuration.total_seconds() if maxDuration else None,
            minDurationInSeconds=minDuration.total_seconds() if minDuration else None,
        )


class FlowSearchRequest(BaseModel):
    """Request body for searching/listing flows."""

    notebook_id: UUID
    start: datetime = Field(..., description="Start datetime for filtering flow events")
    end: datetime = Field(..., description="End datetime for filtering flow events")
    labels: list[LabelFilter] = Field(default_factory=list, description="Label filters as key-value pairs")
    tenant: str = Field(..., description="Tenant for filtering flow events")


class FlowDetailRequest(BaseModel):
    """Request body for getting flow details."""

    notebook_id: UUID
    flow_name: str = Field(..., description="Name of the flow to get details for")
    start: datetime = Field(..., description="Start datetime for filtering flow events")
    end: datetime = Field(..., description="End datetime for filtering flow events")
    labels: list[LabelFilter] = Field(default_factory=list, description="Label filters as key-value pairs")
    tenant: str = Field(..., description="Tenant for filtering flow events")


@router.post("/search", response_model=list[FlowResponse])
async def search_flows(request: FlowSearchRequest, 
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(security)] = None

) -> list[FlowResponse]:
    """Search/list flows with optional label filters.

    Args:
        request: Search request containing datetime range and optional label filters

    Example request body:
        {
            "start": "2024-01-01T00:00:00Z",
            "end": "2024-01-31T23:59:59Z",
            "tenant": "acme-corp",
            "labels": [
                {"label": "environment", "value": "production"}
            ]
        }
    """
    dashfrog = get_dashfrog_instance()

    # Build base filter conditions (time range + labels)
    base_filters = [
        FlowEvent.event_dt >= request.start,
        FlowEvent.event_dt <= request.end,
        FlowEvent.tenant == request.tenant,
    ]

    # Add label filters
    for label_filter in request.labels:
        base_filters.append(
            or_(
                FlowEvent.labels[label_filter.label].astext == label_filter.value,
                FlowEvent.labels[label_filter.label].is_(None),
            )
        )

    with Session(dashfrog.db_engine) as session:
        try:
            notebook = session.execute(select(Notebook).where(Notebook.id == request.notebook_id)).scalar_one()
        except NoResultFound:
            raise HTTPException(status_code=404, detail=f"Notebook {request.notebook_id} not found")
        verify_has_access_to_notebook(credentials, notebook, request.tenant, request.start, request.end, flow_filter=BlockFilters(names=[], filters=request.labels))
        
        return list(flow_generator(session, base_filters))


class FlowHistoryResponse(BaseModel):
    """Response for getting flow history."""

    history: list[FlowHistory]


@router.post("/history", response_model=FlowHistoryResponse)
async def get_flow_history(request: FlowDetailRequest, 
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(security)] = None

) -> FlowHistoryResponse:
    """Get detailed flow information with run history.

    Args:
        request: Request containing flow name, datetime range, and optional label filters

    Example request body:
        {
            "flow_name": "process_order",
            "start": "2024-01-01T00:00:00Z",
            "end": "2024-01-31T23:59:59Z",
            "labels": [
                {"label": "environment", "value": "production"}
            ]
        }
    """
    dashfrog = get_dashfrog_instance()

    # Build base filter conditions (time range + labels + flow name)
    base_filters = [
        FlowEvent.event_dt >= request.start,
        FlowEvent.event_dt <= request.end,
        FlowEvent.flow_metadata["flow_name"].astext == request.flow_name,
        FlowEvent.tenant == request.tenant,
    ]

    # Add label filters
    for label_filter in request.labels:
        # either label key is not in the list or the value matches
        base_filters.append(
            or_(
                FlowEvent.labels[label_filter.label].astext == label_filter.value,
                FlowEvent.labels[label_filter.label].is_(None),
            )
        )

    # Get all flow runs with their events

    with Session(dashfrog.db_engine) as session:
        try:
            notebook = session.execute(select(Notebook).where(Notebook.id == request.notebook_id)).scalar_one()
        except NoResultFound:
            raise HTTPException(status_code=404, detail=f"Notebook {request.notebook_id} not found")
        verify_has_access_to_notebook(credentials, notebook, request.tenant, request.start, request.end, flow_filter=BlockFilters(names=[request.flow_name], filters=request.labels))

        history_query = select(FlowEvent).where(and_(*base_filters)).order_by(FlowEvent.flow_id, FlowEvent.event_dt.asc())
        # Get all events grouped by flow_id
        history_result = session.execute(history_query).scalars()

        flow_histories: list[FlowHistory] = []
        for (flow_id, group_id), events_iter in groupby(history_result, key=lambda e: (e.flow_id, e.group_id)):
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
                if e.event_name
                not in (
                    EVENT_FLOW_START,
                    EVENT_FLOW_SUCCESS,
                    EVENT_FLOW_FAIL,
                    EVENT_STEP_START,
                    EVENT_STEP_SUCCESS,
                    EVENT_STEP_FAIL,
                )
            ]

            # Build steps list from step events
            step_events = [e for e in events_list if e.event_name.startswith("step_")]
            steps: list[FlowHistoryStep] = []

            # Group step events by step_name
            for step_name, step_events_iter in groupby(
                step_events, key=lambda e: e.flow_metadata.get(BAGGAGE_STEP_LABEL_NAME, "")
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
                    groupId=group_id,
                    startTime=start_event.event_dt,
                    endTime=end_time,
                    status=status,
                    events=history_events,
                    steps=steps,
                    labels=start_event.labels,
                )
            )

        return FlowHistoryResponse(history=sorted(flow_histories, key=lambda x: x.startTime, reverse=True))


@router.get("/labels", response_model=list[Label])
async def get_all_flow_labels(auth: Annotated[None, Depends(verify_token)]) -> list[Label]:
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
            AND event_dt >= :threshold_dt
            GROUP BY kv.key, kv.value
            ORDER BY kv.key
        """)
        result = groupby(
            conn.execute(
                query,
                {
                    "event_name": EVENT_FLOW_START,
                    "threshold_dt": datetime.now() - timedelta(days=DEFAULT_THRESHOLD_DAYS),
                },
            ).fetchall(),
            key=lambda x: x[0],
        )
        return [Label(label=label, values=sorted(v[1] for v in values)) for label, values in result]


@router.get("/tenants", response_model=list[str])
async def get_all_flow_tenants(auth: Annotated[None, Depends(verify_token)]) -> list[str]:
    """Fetch all flow tenants from the database."""
    dashfrog = get_dashfrog_instance()
    with Session(dashfrog.db_engine) as session:
        return list(
            session.execute(
                select(FlowEvent.tenant.distinct()).where(
                    FlowEvent.event_dt >= datetime.now() - timedelta(days=DEFAULT_THRESHOLD_DAYS)
                )
            ).scalars()
        )


class FlowStaticResponse(BaseModel):
    """Response for a flow."""
    name: str
    labels: list[str]   

@router.get("/", response_model=list[FlowStaticResponse])
async def get_all_flows(auth: Annotated[None, Depends(verify_token)]) -> list[FlowStaticResponse]:
    """Fetch all flows from the database."""
    dashfrog = get_dashfrog_instance()
    with Session(dashfrog.db_engine) as session:
        flows = session.execute(select(Flow).order_by(Flow.name)).scalars()
        return [FlowStaticResponse(name=flow.name, labels=flow.labels) for flow in flows]