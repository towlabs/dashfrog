"""Timeline API routes."""

from datetime import datetime
from itertools import groupby

from fastapi import APIRouter, Query
from sqlalchemy import text

from dashfrog_python_sdk import get_dashfrog_instance

from .schemas import Label

router = APIRouter(prefix="/timelines", tags=["timelines"])


@router.get("/labels", response_model=list[Label])
async def get_all_timeline_labels(
    start_dt: datetime = Query(..., description="Start datetime for filtering timeline events"),
    end_dt: datetime = Query(..., description="End datetime for filtering timeline events"),
) -> list[Label]:
    """Fetch all timeline labels and their values from the database."""
    dashfrog = get_dashfrog_instance()

    with dashfrog.db_engine.connect() as conn:
        query = text("""
            SELECT kv.key AS label_key,
                kv.value AS label_value
            FROM timeline_event,
                LATERAL jsonb_each_text(labels) AS kv(key, value)
            WHERE event_dt >= :start_dt
              AND event_dt <= :end_dt
            GROUP BY kv.key, kv.value
            ORDER BY kv.key
        """)
        result = groupby(conn.execute(query, {"start_dt": start_dt, "end_dt": end_dt}).fetchall(), key=lambda x: x[0])
        return [Label(label=label, values=sorted(v[1] for v in values)) for label, values in result]
