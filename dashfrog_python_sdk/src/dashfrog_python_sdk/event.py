"""Event insertion for DashFrog."""

from collections.abc import Mapping
import time

from sqlalchemy import (
    insert as sa_insert,
    select,
    update,
)

from .dashfrog import get_dashfrog_instance, refresh_views
from .models import DashfrogMetadata, Event

# Minimum time between refreshes in seconds (default: 60 seconds)
MIN_REFRESH_INTERVAL = 60.0


def insert(flow_id: str, event_name: str, labels: Mapping[str, str]) -> None:
    """
    Insert an event into Postgres.

    Periodically refreshes materialized views based on minimum refresh interval
    to keep views up-to-date.

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

    # Check if enough time has passed since last refresh
    current_time = time.time()
    if dashfrog.last_refresh_ts is None or (current_time - dashfrog.last_refresh_ts) >= MIN_REFRESH_INTERVAL:
        # Try to lock the metadata row (non-blocking with SKIP LOCKED)
        with dashfrog.db_engine.connect() as conn:
            # Try to lock the row - if already locked by another process, skip
            result = conn.execute(
                select(DashfrogMetadata).where(DashfrogMetadata.id == 1).with_for_update(skip_locked=True)
            )
            metadata_row = result.fetchone()

            # If we got the lock (row returned), proceed with refresh
            if metadata_row is not None:
                # Refresh the views
                refresh_views(concurrent=True)

                # Update the metadata table
                update_stmt = (
                    update(DashfrogMetadata).where(DashfrogMetadata.id == 1).values(last_refresh_ts=current_time)
                )
                conn.execute(update_stmt)

                # Update in-memory timestamp
                dashfrog.last_refresh_ts = current_time

                conn.commit()
