from collections.abc import Generator
from contextlib import contextmanager
from logging import warning

from sqlalchemy import insert

from dashfrog_python_sdk.models import FlowEvent

from .constants import (
    BAGGAGE_FLOW_LABEL_NAME,
    BAGGAGE_STEP_LABEL_NAME,
    EVENT_FLOW_FAIL,
    EVENT_FLOW_START,
    EVENT_FLOW_SUCCESS,
    TENANT_LABEL_NAME,
)
from .dashfrog import get_dashfrog_instance
from .utils import generate_flow_group_id, get_flow_id, get_labels_from_baggage, write_to_baggage

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
        group_id = generate_flow_group_id(name, tenant, **labels)
        with write_to_baggage({BAGGAGE_FLOW_LABEL_NAME: name, TENANT_LABEL_NAME: tenant, **labels}):
            # Write START event
            with dashfrog.db_engine.begin() as conn:
                conn.execute(
                    insert(FlowEvent).values(
                        flow_id=flow_id,
                        event_name=EVENT_FLOW_START,
                        labels=labels,
                        tenant=tenant,
                        group_id=group_id,
                        flow_metadata={
                            BAGGAGE_FLOW_LABEL_NAME: name,
                        },
                    )
                )

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
        event_labels = get_labels_from_baggage(mandatory_labels=[BAGGAGE_FLOW_LABEL_NAME, TENANT_LABEL_NAME])
    except ValueError as e:
        warning(e.args[0])
        return

    flow_name = event_labels.pop(BAGGAGE_FLOW_LABEL_NAME)
    tenant = event_labels.pop(TENANT_LABEL_NAME)
    event_labels.pop(BAGGAGE_STEP_LABEL_NAME, None)
    group_id = generate_flow_group_id(flow_name, tenant, **event_labels)
    dashfrog = get_dashfrog_instance()

    with dashfrog.db_engine.begin() as conn:
        conn.execute(
            insert(FlowEvent).values(
                flow_id=flow_id,
                event_name=event_name,
                tenant=tenant,
                group_id=group_id,
                flow_metadata={
                    BAGGAGE_FLOW_LABEL_NAME: flow_name,
                },
                labels=event_labels,
            )
        )


def _end_flow(event_name: str):
    dashfrog = get_dashfrog_instance()

    try:
        flow_id = get_flow_id()
    except ValueError as e:
        warning(e.args[0])
        return

    try:
        event_labels = get_labels_from_baggage(mandatory_labels=[BAGGAGE_FLOW_LABEL_NAME, TENANT_LABEL_NAME])
    except ValueError as e:
        warning(e.args[0])
        return

    flow_name = event_labels.pop(BAGGAGE_FLOW_LABEL_NAME)
    tenant = event_labels.pop(TENANT_LABEL_NAME)
    group_id = generate_flow_group_id(flow_name, tenant, **event_labels)

    with dashfrog.db_engine.begin() as conn:
        conn.execute(
            insert(FlowEvent).values(
                flow_id=flow_id,
                event_name=event_name,
                tenant=tenant,
                group_id=group_id,
                flow_metadata={
                    BAGGAGE_FLOW_LABEL_NAME: flow_name,
                },
                labels=event_labels,
            )
        )


def success():
    """Manually mark a flow as successful. Use this when end_on_exit=False in flow.start()."""
    _end_flow(EVENT_FLOW_SUCCESS)


def fail():
    """Manually mark a flow as failed. Use this when end_on_exit=False in flow.start()."""
    _end_flow(EVENT_FLOW_FAIL)
