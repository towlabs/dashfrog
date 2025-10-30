"""Tests for async flow tracking with FastAPI integration."""

from unittest.mock import MagicMock, patch

from fastapi import FastAPI
from fastapi.testclient import TestClient

from dashfrog_python_sdk import flow, setup
from dashfrog_python_sdk.config import Config
from dashfrog_python_sdk.constants import EVENT_FLOW_START, EVENT_FLOW_SUCCESS

import pytest


@pytest.fixture
def mock_event_insert():
    """Mock event.insert function."""
    with patch("dashfrog_python_sdk.flow.event.insert") as mock_insert:
        yield mock_insert


@pytest.fixture
def mock_db_engine():
    """Mock SQLAlchemy engine."""
    with patch("dashfrog_python_sdk.dashfrog.create_engine") as mock_engine:
        mock_eng = MagicMock()
        mock_engine.return_value = mock_eng
        yield mock_eng


@pytest.fixture
def setup_dashfrog(mock_db_engine, mock_event_insert):
    """Initialize DashFrog with mocked SQLAlchemy engine and event insertion."""
    config = Config(
        otel_endpoint="localhost:4317",
        postgres_host="localhost",
        postgres_dbname="dashfrog_test",
    )
    setup(config)
    return mock_event_insert


def test_simple_async_flow_with_fastapi(setup_dashfrog):
    """Test async flow: start flow, call endpoint inside context to complete it."""
    mock_insert = setup_dashfrog

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
    with flow.start("process_order", end_on_exit=False, order_id="123"):
        # Call endpoint - should run in async context but still have access to baggage
        response = client.post("/complete")
        assert response.status_code == 200

    # Should have START + SUCCESS events
    assert mock_insert.call_count == 2

    # Verify START event
    start_call = mock_insert.call_args_list[0]
    start_trace_id = start_call[0][0]
    assert start_call[0][1] == EVENT_FLOW_START
    assert start_call[0][2]["flow_name"] == "process_order"
    assert start_call[0][2]["order_id"] == "123"

    # Verify SUCCESS event
    success_call = mock_insert.call_args_list[1]
    success_trace_id = success_call[0][0]
    assert success_call[0][1] == EVENT_FLOW_SUCCESS
    assert success_call[0][2]["flow_name"] == "process_order"

    # Verify same trace_id
    assert start_trace_id == success_trace_id
