from contextlib import contextmanager
from logging import warning
from typing import Generator

from . import event
from .constants import (
    BAGGAGE_FLOW_LABEL_PREFIX,
    BAGGAGE_FLOW_NAME,
    BAGGAGE_STEP_NAME,
    EVENT_STEP_FAIL,
    EVENT_STEP_START,
    EVENT_STEP_SUCCESS,
)

from opentelemetry import baggage, context
from opentelemetry.trace import INVALID_SPAN, get_current_span


@contextmanager
def start(name: str, end_on_exit: bool = True) -> Generator[None, None, None]:
    """
    Start a step within a flow.

    Usage:
        from dashfrog import step

        # Automatic ending (default)
        with step.start("validate_order"):
            # work
            pass  # Automatically writes START and SUCCESS/FAIL events

        # Manual ending (for async scenarios)
        with step.start("process_payment", end_on_exit=False):
            # work
            pass  # Writes START event only

        # Later, in async process:
        step.success()  # or step.fail()

    Automatically linked to current flow via baggage, records to Postgres.
    """
    span = get_current_span()

    if span == INVALID_SPAN:
        warning(f"Step '{name}' started outside of a span context")
        yield
        return

    # Set step name in baggage
    ctx = baggage.set_baggage(BAGGAGE_STEP_NAME, name)
    context.attach(ctx)

    # Write START event
    _write_step_event(name, EVENT_STEP_START)

    try:
        yield
        # Success case
        if end_on_exit:
            _write_step_event(name, EVENT_STEP_SUCCESS)
    except Exception:
        # Failure case
        if end_on_exit:
            _write_step_event(name, EVENT_STEP_FAIL)
        raise
    finally:
        # Remove step name from baggage
        ctx = baggage.remove_baggage(BAGGAGE_STEP_NAME)
        context.attach(ctx)


def _write_step_event(step_name: str, event_name: str) -> None:
    """Write step event to Postgres."""
    span = get_current_span()

    if span == INVALID_SPAN:
        warning(f"Cannot write step event '{step_name}' without span")
        return

    trace_id = span.get_span_context().trace_id
    flow_name = baggage.get_baggage(BAGGAGE_FLOW_NAME)
    if not flow_name:
        warning("Trying to write step event without a flow name")
        return

    # Build labels dict with step_name, flow_name, and all flow labels
    event_labels = {
        "step_name": step_name,
        "flow_name": str(flow_name),
    }
    for k, v in baggage.get_all().items():
        if k.startswith(BAGGAGE_FLOW_LABEL_PREFIX):
            label_key = k.removeprefix(BAGGAGE_FLOW_LABEL_PREFIX)
            event_labels[label_key] = str(v)

    event.insert(trace_id, event_name, event_labels)


def success() -> None:
    """End the current step with success."""
    step_name = baggage.get_baggage(BAGGAGE_STEP_NAME)
    if not step_name:
        warning("Trying to end step without step context")
        return
    _write_step_event(str(step_name), EVENT_STEP_SUCCESS)


def fail() -> None:
    """End the current step with failure."""
    step_name = baggage.get_baggage(BAGGAGE_STEP_NAME)
    if not step_name:
        warning("Trying to end step without step context")
        return
    _write_step_event(str(step_name), EVENT_STEP_FAIL)
