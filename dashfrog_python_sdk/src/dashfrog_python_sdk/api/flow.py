"""Flow API routes."""

from datetime import datetime
from itertools import groupby

from fastapi import APIRouter, Query
from sqlalchemy import text

from dashfrog_python_sdk import get_dashfrog_instance
from dashfrog_python_sdk.constants import EVENT_FLOW_FAIL, EVENT_FLOW_START, EVENT_FLOW_SUCCESS

from .schemas import FlowResponse, Label

router = APIRouter(prefix="/flows", tags=["flows"])


@router.get("/", response_model=list[FlowResponse])
async def list_flows(
    start_dt: datetime = Query(..., description="Start datetime for filtering flow events"),
    end_dt: datetime = Query(..., description="End datetime for filtering flow events"),
) -> list[FlowResponse]:
    """List all flows."""
    dashfrog = get_dashfrog_instance()
    with dashfrog.db_engine.connect() as conn:
        query = text(f"""
        WITH flow_stats AS (
            SELECT
                labels->>'flow_name' as name,
                count(DISTINCT flow_id) as runCount,
                count(DISTINCT flow_id) filter (where event_name = '{EVENT_FLOW_SUCCESS}') as successCount,
                count(DISTINCT flow_id) filter (where event_name = '{EVENT_FLOW_FAIL}') as failedCount,
                count(DISTINCT CASE
                    WHEN event_name = '{EVENT_FLOW_START}'
                    AND NOT EXISTS (
                        SELECT 1 FROM flow_event fe2
                        WHERE fe2.flow_id = flow_event.flow_id
                        AND fe2.event_name IN ('{EVENT_FLOW_SUCCESS}', '{EVENT_FLOW_FAIL}')
                    )
                    THEN flow_id
                END) as pendingCount
            FROM flow_event
            WHERE event_dt >= :start_dt
            AND event_dt <= :end_dt
            GROUP BY labels->>'flow_name'
        ),
        latest_run AS (
            SELECT DISTINCT ON (labels->>'flow_name')
                labels->>'flow_name' AS name,
                flow_id,
                event_name as lastRunEventType,
                labels,
                event_dt as lastRunEventDt
            FROM flow_event
            WHERE event_dt >= :start_dt
            AND event_dt <= :end_dt
            ORDER BY labels->>'flow_name', event_dt DESC
        ),
        latest_start AS (
            SELECT DISTINCT ON (flow_id)
                flow_id,
                event_dt as lastRunStartedAt
            FROM flow_event
            WHERE event_name = '{EVENT_FLOW_START}'
            AND event_dt >= :start_dt
            AND event_dt <= :end_dt
            ORDER BY flow_id, event_dt DESC
        )
        SELECT
            flow_stats.name,
            flow_stats.runCount,
            flow_stats.successCount,
            flow_stats.failedCount,
            flow_stats.pendingCount,
            latest_start.lastRunStartedAt,
            latest_run.labels,
            latest_run.lastRunEventType,
            latest_run.lastRunEventDt
        FROM flow_stats
        JOIN latest_run ON flow_stats.name = latest_run.name
        JOIN latest_start ON latest_run.flow_id = latest_start.flow_id
        """)
        result = conn.execute(query, {"start_dt": start_dt, "end_dt": end_dt}).fetchall()
        return [
            FlowResponse(
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
                pendingCount=pendingCount,
                failedCount=failedCount,
            )
            for name, runCount, successCount, failedCount, pendingCount, lastRunStartedAt, labels, lastRunEventType, lastRunEventDt in result
        ]


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
