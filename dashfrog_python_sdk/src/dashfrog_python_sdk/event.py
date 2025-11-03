"""Event insertion for DashFrog."""

from collections.abc import Mapping

from sqlalchemy import insert as sa_insert

from .dashfrog import get_dashfrog_instance
from .models import Event


def insert(flow_id: str, event_name: str, labels: Mapping[str, str]) -> None:
    """
    Insert an event into Postgres.

    Args:
        flow_id: The flow ID (this is the trace ID from the current span)
        event_name: The event name (e.g., "flow_start", "step_success", "incident_start")
        labels: Dictionary of labels/metadata for this event
    """
    dashfrog = get_dashfrog_instance()

    # Insert using SQLAlchemy Core
    stmt = sa_insert(Event).values(
        flow_id=flow_id,
        event_name=event_name,
        labels=dict(labels),
    )
    with dashfrog.db_engine.begin() as conn:
        conn.execute(stmt)
