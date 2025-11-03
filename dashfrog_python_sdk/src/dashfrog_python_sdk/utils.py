from collections.abc import Generator, Mapping, Sequence
from contextlib import contextmanager
import time

from sqlalchemy import (
    insert as sa_insert,
    select,
    update,
)

from .constants import BAGGAGE_FLOW_LABEL_PREFIX, MIN_REFRESH_INTERVAL
from .dashfrog import get_dashfrog_instance, refresh_views
from .models import DashfrogMetadata, Event

from opentelemetry import baggage, context
from opentelemetry.trace import INVALID_SPAN, get_current_span


def get_labels_from_baggage(mandatory_labels: Sequence[str]) -> dict[str, str]:
    labels = {}
    for k, v in baggage.get_all().items():
        if k.startswith(BAGGAGE_FLOW_LABEL_PREFIX):
            label_key = k.removeprefix(BAGGAGE_FLOW_LABEL_PREFIX)
            labels[label_key] = v

    if missing_labels := set(mandatory_labels) - set(labels.keys()):
        raise ValueError(f"Missing mandatory labels: {missing_labels}")
    return labels


@contextmanager
def write_to_baggage(labels: Mapping[str, str]) -> Generator[None, None, None]:
    ctx = context.get_current()
    for k, v in labels.items():
        ctx = baggage.set_baggage(f"{BAGGAGE_FLOW_LABEL_PREFIX}{k}", v, context=ctx)
    token_ctx = context.attach(ctx)
    try:
        yield
    finally:
        context.detach(token_ctx)


def get_flow_id() -> str:
    span = get_current_span()
    if span == INVALID_SPAN:
        raise ValueError("No span found")
    return str(span.get_span_context().trace_id)


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
