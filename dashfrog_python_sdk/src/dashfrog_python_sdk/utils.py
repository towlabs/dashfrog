import datetime
from collections.abc import Generator, Mapping, Sequence
from contextlib import contextmanager
from datetime import timezone

from sqlalchemy import (
    insert as insert,
)

from .constants import BAGGAGE_FLOW_LABEL_PREFIX

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


def generate_flow_group_id(flow_name: str, tenant: str, **labels: str) -> str:
    serialized_labels = "$$".join(f"{k}={v}" for k, v in labels.items())
    return f"{flow_name}$$tenant={tenant}$${serialized_labels}"


def get_time_range_from_time_window(time_window: dict | None) -> tuple[datetime.datetime, datetime.datetime]:
    """
    Convert a time window configuration to absolute start and end datetimes.

    Args:
        time_window: Time window config with structure:
            - {"type": "absolute", "metadata": {"start": "ISO8601", "end": "ISO8601"}}
            - {"type": "relative", "metadata": {"value": "24h" | "7d" | "today" | "w"}}

    Returns:
        Tuple of (start_datetime, end_datetime)

    Raises:
        ValueError: If time_window is None or has invalid format
    """
    if time_window is None:
        raise ValueError("time_window cannot be None")

    if time_window["type"] == "absolute":
        window_start = datetime.datetime.fromisoformat(time_window["metadata"]["start"])
        window_end = datetime.datetime.fromisoformat(time_window["metadata"]["end"])
        return window_start, window_end
    else:  # relative
        value = time_window["metadata"]["value"]

        if value == "today":
            delta, unit = 24, "h"
        elif value == "w":
            delta, unit = 7, "d"
        else:
            delta, unit = int(value[:-1]), value[-1]

        factor = 1
        if unit == "h":
            factor = 60
        elif unit == "d":
            factor = 60 * 24

        delta_in_minutes = delta * factor + 60
        window_start = datetime.datetime.now(timezone.utc) - datetime.timedelta(minutes=delta_in_minutes)
        window_end = datetime.datetime.now(timezone.utc)

        return window_start, window_end
