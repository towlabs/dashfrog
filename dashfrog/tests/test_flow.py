"""Tests for flow tracking."""

from sqlalchemy.orm import Session

from dashfrog import flow, get_dashfrog_instance
from dashfrog.constants import EVENT_FLOW_FAIL, EVENT_FLOW_START, EVENT_FLOW_SUCCESS
from dashfrog.models import FlowEvent

import pytest


class TestSync:
    """Test synchronous flow context manager behavior."""

    def test_successful_flow(self, setup_dashfrog):
        """Test flow that completes successfully."""
        # Execute flow
        with flow.start("test_flow", tenant="test_tenant", customer_id="123"):
            pass  # Successful completion

        # Query database to verify events
        dashfrog = get_dashfrog_instance()
        with Session(dashfrog.db_engine) as session:
            events = session.query(FlowEvent).order_by(FlowEvent.id).all()

            # Verify 2 events were inserted (START and SUCCESS)
            assert len(events) == 2

            # Verify START event
            start_event = events[0]
            assert start_event.event_name == EVENT_FLOW_START
            assert start_event.flow_metadata["flow_name"] == "test_flow"
            assert start_event.labels["customer_id"] == "123"
            assert start_event.tenant == "test_tenant"

            # Verify SUCCESS event
            success_event = events[1]
            assert success_event.event_name == EVENT_FLOW_SUCCESS
            assert success_event.flow_metadata["flow_name"] == "test_flow"

            # Verify flow_id is consistent
            assert start_event.flow_id == success_event.flow_id

    def test_failed_flow(self, setup_dashfrog):
        """Test flow that raises an exception."""
        # Execute flow that fails
        with pytest.raises(ValueError):
            with flow.start("failing_flow", tenant="test_tenant", operation="delete"):
                raise ValueError("Something went wrong")

        # Query database to verify events
        dashfrog = get_dashfrog_instance()
        with Session(dashfrog.db_engine) as session:
            events = session.query(FlowEvent).order_by(FlowEvent.id).all()

            # Verify 2 events were inserted (START and FAIL)
            assert len(events) == 2

            # Verify START event
            start_event = events[0]
            assert start_event.event_name == EVENT_FLOW_START

            # Verify FAIL event
            fail_event = events[1]
            assert fail_event.event_name == EVENT_FLOW_FAIL
            assert fail_event.flow_metadata["flow_name"] == "failing_flow"

            # Verify flow_id is consistent
            assert start_event.flow_id == fail_event.flow_id
