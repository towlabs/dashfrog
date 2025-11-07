from collections.abc import Generator
from contextlib import contextmanager
from logging import warning

from .constants import (
    BAGGAGE_FLOW_LABEL_NAME,
    EVENT_FLOW_FAIL,
    EVENT_FLOW_START,
    EVENT_FLOW_SUCCESS,
)
from .dashfrog import get_dashfrog_instance
from .utils import get_flow_id, get_labels_from_baggage, insert_flow_event, write_to_baggage

from opentelemetry import trace


@contextmanager
def start(name: str, tenant: str, end_on_exit: bool = True, **labels: str) -> Generator[str, None, None]:
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
    dashfrog = get_dashfrog_instance()
    dashfrog.register_flow(name, *labels)

    # Always create fresh span
    with tracer.start_as_current_span(f"flow.{name}") as span:
        flow_id = str(span.get_span_context().trace_id)
        event_labels = {BAGGAGE_FLOW_LABEL_NAME: name, "tenant": tenant, **labels}
        with write_to_baggage(event_labels):
            # Write START event
            insert_flow_event(flow_id, EVENT_FLOW_START, event_labels)

            try:
                yield flow_id
            except Exception:
                if end_on_exit:
                    _end_flow(EVENT_FLOW_FAIL)
                raise
            else:
                if end_on_exit:
                    _end_flow(EVENT_FLOW_SUCCESS)


def event(event_name: str):
    """Write a custom event to the database."""

    try:
        flow_id = get_flow_id()
    except ValueError as e:
        warning(e.args[0])
        return

    try:
        event_labels = get_labels_from_baggage(mandatory_labels=[BAGGAGE_FLOW_LABEL_NAME])
    except ValueError as e:
        warning(e.args[0])
        return

    insert_flow_event(flow_id, event_name, event_labels)


def _end_flow(event_name: str):
    try:
        flow_id = get_flow_id()
    except ValueError as e:
        warning(e.args[0])
        return

    try:
        event_labels = get_labels_from_baggage(mandatory_labels=[BAGGAGE_FLOW_LABEL_NAME])
    except ValueError as e:
        warning(e.args[0])
        return

    insert_flow_event(flow_id, event_name, event_labels)


def success():
    _end_flow(EVENT_FLOW_SUCCESS)


def fail():
    _end_flow(EVENT_FLOW_FAIL)
