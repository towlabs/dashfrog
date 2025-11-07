"""Tests for async flow tracking with FastAPI integration."""

from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from dashfrog_python_sdk import flow, get_dashfrog_instance
from dashfrog_python_sdk.constants import EVENT_FLOW_START, EVENT_FLOW_SUCCESS
from dashfrog_python_sdk.models import FlowEvent


class TestAsync:
    """Test async flow without end_on_exit."""

    def test_async_flow_with_network_call(self, setup_dashfrog):
        """Test async flow: start flow with end_on_exit=False and complete via network call."""
        # Create simple FastAPI app
        app = FastAPI()

        # Instrument FastAPI to propagate trace context
        from dashfrog_python_sdk import with_fastapi

        with_fastapi(app)

        @app.post("/complete")
        def complete_flow():
            """Complete the flow using propagated context."""
            flow.success()
            return {"status": "completed"}

        client = TestClient(app)

        # Start flow and call completion endpoint inside the context
        with flow.start("process_order", tenant="test_tenant", end_on_exit=False, order_id="123"):
            # Call endpoint - should run in async context but still have access to baggage
            response = client.post("/complete")
            assert response.status_code == 200

        # Query database to verify events
        dashfrog = get_dashfrog_instance()
        with Session(dashfrog.db_engine) as session:
            events = session.query(FlowEvent).order_by(FlowEvent.id).all()

            # Should have START + SUCCESS events
            assert len(events) == 2

            # Verify START event
            start_event = events[0]
            assert start_event.event_name == EVENT_FLOW_START
            assert start_event.labels["flow_name"] == "process_order"
            assert start_event.labels["order_id"] == "123"

            # Verify SUCCESS event
            success_event = events[1]
            assert success_event.event_name == EVENT_FLOW_SUCCESS
            assert success_event.labels["flow_name"] == "process_order"

            # Verify same trace_id
            assert start_event.flow_id == success_event.flow_id
