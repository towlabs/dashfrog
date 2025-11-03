"""Tests for flow tracking."""

from sqlalchemy.orm import Session

from dashfrog_python_sdk import flow, get_dashfrog_instance
from dashfrog_python_sdk.constants import EVENT_FLOW_FAIL, EVENT_FLOW_START, EVENT_FLOW_SUCCESS
from dashfrog_python_sdk.models import Event

import pytest


class TestFlowContextManager:
    """Test flow context manager behavior."""

    def test_successful_flow(self, setup_dashfrog):
        """Test flow that completes successfully."""
        # Execute flow
        with flow.start("test_flow", tenant="test_tenant", customer_id="123", region="us-east"):
            pass  # Successful completion

        # Query database to verify events
        dashfrog = get_dashfrog_instance()
        with Session(dashfrog.db_engine) as session:
            events = session.query(Event).order_by(Event.id).all()

            # Verify 2 events were inserted (START and SUCCESS)
            assert len(events) == 2

            # Verify START event
            start_event = events[0]
            assert start_event.event_name == EVENT_FLOW_START
            assert start_event.labels == {
                "flow_name": "test_flow",
                "customer_id": "123",
                "region": "us-east",
                "tenant": "test_tenant",
            }
            assert start_event.flow_id is not None  # valid trace_id

            # Verify SUCCESS event
            success_event = events[1]
            assert success_event.event_name == EVENT_FLOW_SUCCESS
            assert success_event.labels == {
                "flow_name": "test_flow",
                "customer_id": "123",
                "region": "us-east",
                "tenant": "test_tenant",
            }

            # Verify trace_id is consistent
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
            events = session.query(Event).order_by(Event.id).all()

            # Verify 2 events were inserted (START and FAIL)
            assert len(events) == 2

            # Verify START event
            start_event = events[0]
            assert start_event.event_name == EVENT_FLOW_START

            # Verify FAIL event
            fail_event = events[1]
            assert fail_event.event_name == EVENT_FLOW_FAIL
            assert fail_event.labels["flow_name"] == "failing_flow"
            assert fail_event.labels["operation"] == "delete"

            # Verify trace_id is consistent
            assert start_event.flow_id == fail_event.flow_id

    def test_flow_with_end_on_exit_false(self, setup_dashfrog):
        """Test flow with end_on_exit=False (async mode)."""
        # Execute flow with manual ending
        with flow.start("async_flow", tenant="test_tenant", end_on_exit=False, batch_id="456"):
            pass  # No automatic end event

        # Query database to verify events
        dashfrog = get_dashfrog_instance()
        with Session(dashfrog.db_engine) as session:
            events = session.query(Event).order_by(Event.id).all()

            # Verify only 1 event was inserted (START)
            assert len(events) == 1

            start_event = events[0]
            assert start_event.event_name == EVENT_FLOW_START
            assert start_event.labels == {
                "flow_name": "async_flow",
                "batch_id": "456",
                "tenant": "test_tenant",
            }

    def test_multiple_sequential_flows(self, setup_dashfrog):
        """Test multiple flows executed sequentially."""
        with flow.start("flow1", tenant="test_tenant", tag="a"):
            pass

        with flow.start("flow2", tenant="test_tenant", tag="b"):
            pass

        # Query database to verify events
        dashfrog = get_dashfrog_instance()
        with Session(dashfrog.db_engine) as session:
            events = session.query(Event).order_by(Event.id).all()

            # Should have 4 events (2 flows × 2 events each)
            assert len(events) == 4

            # Verify flow1 events
            flow1_start = events[0]
            flow1_success = events[1]
            assert flow1_start.labels["flow_name"] == "flow1"
            assert flow1_start.labels["tag"] == "a"
            assert flow1_success.labels["tag"] == "a"

            # Verify flow2 events
            flow2_start = events[2]
            flow2_success = events[3]
            assert flow2_start.labels["flow_name"] == "flow2"
            assert flow2_start.labels["tag"] == "b"
            assert flow2_success.labels["tag"] == "b"

            # Verify different trace_ids
            assert flow1_start.flow_id != flow2_start.flow_id
