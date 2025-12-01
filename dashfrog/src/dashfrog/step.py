from collections.abc import Generator
from contextlib import contextmanager
from logging import warning

from sqlalchemy import insert

from dashfrog.models import FlowEvent

from .constants import (
    BAGGAGE_FLOW_LABEL_NAME,
    BAGGAGE_STEP_LABEL_NAME,
    EVENT_STEP_FAIL,
    EVENT_STEP_START,
    EVENT_STEP_SUCCESS,
    TENANT_LABEL_NAME,
)
from .dashfrog import get_dashfrog_instance
from .utils import generate_flow_group_id, get_flow_id, get_labels_from_baggage, write_to_baggage


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

    # Set step name in baggage
    with write_to_baggage({BAGGAGE_STEP_LABEL_NAME: name}):
        # Write START event
        _write_step_event(EVENT_STEP_START)

        try:
            yield
        except Exception:
            # Failure case
            if end_on_exit:
                _write_step_event(EVENT_STEP_FAIL)
            raise
        else:
            # Success case
            if end_on_exit:
                _write_step_event(EVENT_STEP_SUCCESS)


def _write_step_event(event_name: str) -> None:
    """Write step event to Postgres."""
    try:
        flow_id = get_flow_id()
    except ValueError as e:
        warning(e.args[0])
        return

    try:
        event_labels = get_labels_from_baggage(
            mandatory_labels=[BAGGAGE_FLOW_LABEL_NAME, BAGGAGE_STEP_LABEL_NAME, TENANT_LABEL_NAME]
        )
    except ValueError as e:
        warning(e.args[0])
        return

    flow_name = event_labels.pop(BAGGAGE_FLOW_LABEL_NAME)
    tenant = event_labels.pop(TENANT_LABEL_NAME)
    step_name = event_labels.pop(BAGGAGE_STEP_LABEL_NAME)
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
                    BAGGAGE_STEP_LABEL_NAME: step_name,
                },
                labels=event_labels,
            )
        )


def success() -> None:
    """End the current step with success."""
    _write_step_event(EVENT_STEP_SUCCESS)


def fail() -> None:
    """End the current step with failure."""
    _write_step_event(EVENT_STEP_FAIL)
