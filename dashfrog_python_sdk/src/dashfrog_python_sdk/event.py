"""Event insertion for DashFrog."""

from collections.abc import Mapping
from datetime import datetime
import json

from sqlalchemy import text

from .constants import TABLE_EVENTS
from .dashfrog import get_dashfrog_instance


def insert(trace_id: int, event_name: str, labels: Mapping[str, str | None]) -> None:
    """
    Insert an event into Postgres.

    Args:
        trace_id: The trace ID from the current span
        event_name: The event name (e.g., "flow_start", "step_success", "incident_start")
        labels: Dictionary of labels/metadata for this event

    Example:
        from dashfrog_python_sdk.event import insert

        insert(
            trace_id=12345,
            event_name="flow_start",
            labels={"flow_name": "process_order", "customer_id": "123"}
        )
    """
    dashfrog = get_dashfrog_instance()

    # Convert labels dict to JSON for JSONB column
    labels_json = json.dumps(labels)

    # Use SQLAlchemy to execute insert
    with dashfrog.db_engine.connect() as conn:
        conn.execute(
            text(
                f"INSERT INTO {TABLE_EVENTS} (trace_id, event_name, event_dt, labels) VALUES (:trace_id, :event_name, :event_dt, :labels)"
            ),
            {"trace_id": trace_id, "event_name": event_name, "event_dt": datetime.now(), "labels": labels_json},
        )
        conn.commit()
