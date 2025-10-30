from contextlib import contextmanager
from logging import warning

from . import event
from .constants import (
    BAGGAGE_FLOW_LABEL_PREFIX,
    BAGGAGE_FLOW_NAME,
    EVENT_FLOW_FAIL,
    EVENT_FLOW_START,
    EVENT_FLOW_SUCCESS,
)

from opentelemetry import baggage, context, trace
from opentelemetry.trace import INVALID_SPAN, get_current_span


@contextmanager
def start(name: str, end_on_exit: bool = True, **labels: str):
    """
    Start a business workflow/process flow.

    Usage:
        from dashfrog import flow

        # Automatic flow ending (default)
        with flow.start("process_order"):
            # ... work
            pass  # Automatically writes SUCCESS/FAIL event on exit

        # Manual flow ending (for async scenarios)
        with flow.start("batch_job", end_on_exit=False):
            # ... work
            pass  # Span closes, but flow stays open

        # Later, in async process:
        flow.success()  # or flow.fail()

    Automatically creates span for trace propagation and records to Postgres.
    """
    tracer = trace.get_tracer("dashfrog")

    # Always create fresh span
    with tracer.start_as_current_span(f"flow.{name}") as span:
        trace_id = span.get_span_context().trace_id

        # Set all baggage on current context
        ctx = context.get_current()
        ctx = baggage.set_baggage(BAGGAGE_FLOW_NAME, name, ctx)
        for k, v in labels.items():
            ctx = baggage.set_baggage(f"{BAGGAGE_FLOW_LABEL_PREFIX}{k}", v, ctx)
        context.attach(ctx)

        # Insert START event
        event_labels = {"flow_name": name, **labels}
        event.insert(trace_id, EVENT_FLOW_START, event_labels)

        try:
            yield
        except Exception:
            if end_on_exit:
                _end_flow(EVENT_FLOW_FAIL)
            raise
        else:
            if end_on_exit:
                _end_flow(EVENT_FLOW_SUCCESS)


def _end_flow(event_name: str):
    span = get_current_span()
    if span == INVALID_SPAN:
        warning("Trying to end flow without a span")
        return
    trace_id = span.get_span_context().trace_id
    flow_name = baggage.get_baggage(BAGGAGE_FLOW_NAME)
    if not flow_name:
        warning("Trying to end flow without a flow name")
        return

    # Build labels dict with flow_name and all flow labels
    event_labels = {"flow_name": str(flow_name)}
    for k, v in baggage.get_all().items():
        if k.startswith(BAGGAGE_FLOW_LABEL_PREFIX):
            label_key = k.removeprefix(BAGGAGE_FLOW_LABEL_PREFIX)
            event_labels[label_key] = str(v)

    event.insert(trace_id, event_name, event_labels)


def success():
    _end_flow(EVENT_FLOW_SUCCESS)


def fail():
    _end_flow(EVENT_FLOW_FAIL)
