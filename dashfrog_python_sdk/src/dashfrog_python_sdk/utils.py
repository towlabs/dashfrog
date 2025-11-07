from collections.abc import Generator, Mapping, Sequence
from contextlib import contextmanager

from sqlalchemy import (
    insert as insert,
)

from .constants import BAGGAGE_FLOW_LABEL_PREFIX
from .dashfrog import get_dashfrog_instance
from .models import FlowEvent

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


def insert_flow_event(flow_id: str, event_name: str, labels: Mapping[str, str]) -> None:
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

    with dashfrog.db_engine.begin() as conn:
        conn.execute(
            insert(FlowEvent).values(
                flow_id=flow_id,
                event_name=event_name,
                labels=dict(labels),
            )
        )
