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


class TestFlowEvent:
    """Test flow.event() function."""

    def test_event_within_flow(self, setup_dashfrog):
        """Test writing custom events within a flow."""
        with flow.start("order_flow", tenant="test_tenant", order_id="ORD-123"):
            flow.event("payment_initiated")
            flow.event("payment_completed")

        # Query database to verify events
        dashfrog = get_dashfrog_instance()
        with Session(dashfrog.db_engine) as session:
            events = session.query(Event).order_by(Event.id).all()

            # Verify 4 events: START, payment_initiated, payment_completed, SUCCESS
            assert len(events) == 4

            start_event = events[0]
            payment_initiated_event = events[1]
            payment_completed_event = events[2]
            success_event = events[3]

            # Verify START event
            assert start_event.event_name == EVENT_FLOW_START
            assert start_event.labels["flow_name"] == "order_flow"
            assert start_event.labels["order_id"] == "ORD-123"

            # Verify custom payment_initiated event
            assert payment_initiated_event.event_name == "payment_initiated"
            assert payment_initiated_event.labels["flow_name"] == "order_flow"
            assert payment_initiated_event.labels["order_id"] == "ORD-123"
            assert payment_initiated_event.flow_id == start_event.flow_id

            # Verify custom payment_completed event
            assert payment_completed_event.event_name == "payment_completed"
            assert payment_completed_event.labels["flow_name"] == "order_flow"
            assert payment_completed_event.labels["order_id"] == "ORD-123"
            assert payment_completed_event.flow_id == start_event.flow_id

            # Verify SUCCESS event
            assert success_event.event_name == EVENT_FLOW_SUCCESS
            assert success_event.flow_id == start_event.flow_id

    def test_event_outside_flow(self, setup_dashfrog, caplog):
        """Test that event() warns and does nothing when called outside a flow."""
        import logging
        caplog.set_level(logging.WARNING)

        # Call event outside of any flow context
        flow.event("orphan_event")

        # Verify warning was logged
        assert "No span found" in caplog.text

        # Query database to verify no events were inserted
        dashfrog = get_dashfrog_instance()
        with Session(dashfrog.db_engine) as session:
            events = session.query(Event).all()
            assert len(events) == 0

    def test_multiple_events_in_flow(self, setup_dashfrog):
        """Test multiple custom events with different names."""
        with flow.start("checkout_flow", tenant="test_tenant", session_id="sess-456"):
            flow.event("cart_validated")
            flow.event("inventory_checked")
            flow.event("shipping_calculated")
            flow.event("order_confirmed")

        # Query database
        dashfrog = get_dashfrog_instance()
        with Session(dashfrog.db_engine) as session:
            events = session.query(Event).order_by(Event.id).all()

            # Verify 6 events: START + 4 custom events + SUCCESS
            assert len(events) == 6

            # All events should have the same flow_id
            flow_ids = [e.flow_id for e in events]
            assert len(set(flow_ids)) == 1

            # Verify custom event names
            event_names = [e.event_name for e in events]
            assert EVENT_FLOW_START in event_names
            assert "cart_validated" in event_names
            assert "inventory_checked" in event_names
            assert "shipping_calculated" in event_names
            assert "order_confirmed" in event_names
            assert EVENT_FLOW_SUCCESS in event_names

            # All events should inherit the flow labels
            for event in events:
                assert event.labels["flow_name"] == "checkout_flow"
                assert event.labels["session_id"] == "sess-456"
                assert event.labels["tenant"] == "test_tenant"

    def test_event_in_failed_flow(self, setup_dashfrog):
        """Test that custom events are recorded even if flow fails."""
        with pytest.raises(RuntimeError):
            with flow.start("risky_operation", tenant="test_tenant", user_id="user-789"):
                flow.event("validation_passed")
                flow.event("processing_started")
                raise RuntimeError("Unexpected error")

        # Query database
        dashfrog = get_dashfrog_instance()
        with Session(dashfrog.db_engine) as session:
            events = session.query(Event).order_by(Event.id).all()

            # Verify 4 events: START, 2 custom events, FAIL
            assert len(events) == 4

            assert events[0].event_name == EVENT_FLOW_START
            assert events[1].event_name == "validation_passed"
            assert events[2].event_name == "processing_started"
            assert events[3].event_name == EVENT_FLOW_FAIL

            # All should have same flow_id
            assert events[0].flow_id == events[1].flow_id == events[2].flow_id == events[3].flow_id
