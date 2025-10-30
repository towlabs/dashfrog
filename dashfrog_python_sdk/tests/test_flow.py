"""Tests for flow tracking."""

from unittest.mock import MagicMock, patch

from dashfrog_python_sdk import flow, setup
from dashfrog_python_sdk.config import Config
from dashfrog_python_sdk.constants import EVENT_FLOW_FAIL, EVENT_FLOW_START, EVENT_FLOW_SUCCESS

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


class TestFlowContextManager:
    """Test flow context manager behavior."""

    def test_successful_flow(self, setup_dashfrog):
        """Test flow that completes successfully."""
        mock_insert = setup_dashfrog

        # Execute flow
        with flow.start("test_flow", customer_id="123", region="us-east"):
            pass  # Successful completion

        # Verify event.insert was called twice (START and SUCCESS)
        assert mock_insert.call_count == 2

        # Verify START event
        start_call = mock_insert.call_args_list[0]
        start_trace_id = start_call[0][0]
        start_event_name = start_call[0][1]
        start_labels = start_call[0][2]

        assert start_event_name == EVENT_FLOW_START
        assert start_labels == {
            "flow_name": "test_flow",
            "customer_id": "123",
            "region": "us-east",
        }
        assert start_trace_id > 0  # valid trace_id

        # Verify SUCCESS event
        success_call = mock_insert.call_args_list[1]
        success_trace_id = success_call[0][0]
        success_event_name = success_call[0][1]
        success_labels = success_call[0][2]

        assert success_event_name == EVENT_FLOW_SUCCESS
        assert success_labels["flow_name"] == "test_flow"
        assert success_labels["customer_id"] == "123"
        assert success_labels["region"] == "us-east"

        # Verify trace_id is consistent
        assert start_trace_id == success_trace_id

    def test_failed_flow(self, setup_dashfrog):
        """Test flow that raises an exception."""
        mock_insert = setup_dashfrog

        # Execute flow that fails
        with pytest.raises(ValueError):
            with flow.start("failing_flow", operation="delete"):
                raise ValueError("Something went wrong")

        # Verify event.insert was called twice (START and FAIL)
        assert mock_insert.call_count == 2

        # Verify START event
        start_call = mock_insert.call_args_list[0]
        assert start_call[0][1] == EVENT_FLOW_START

        # Verify FAIL event
        fail_call = mock_insert.call_args_list[1]
        fail_trace_id = fail_call[0][0]
        fail_event_name = fail_call[0][1]
        fail_labels = fail_call[0][2]

        assert fail_event_name == EVENT_FLOW_FAIL
        assert fail_labels["flow_name"] == "failing_flow"
        assert fail_labels["operation"] == "delete"

        # Verify trace_id is consistent
        assert start_call[0][0] == fail_trace_id

    def test_flow_with_end_on_exit_false(self, setup_dashfrog):
        """Test flow with end_on_exit=False (async mode)."""
        mock_insert = setup_dashfrog

        # Execute flow with manual ending
        with flow.start("async_flow", end_on_exit=False, batch_id="456"):
            pass  # No automatic end event

        # Verify only START event was inserted
        assert mock_insert.call_count == 1

        start_call = mock_insert.call_args_list[0]
        assert start_call[0][1] == EVENT_FLOW_START
        assert start_call[0][2] == {
            "flow_name": "async_flow",
            "batch_id": "456",
        }

    def test_multiple_sequential_flows(self, setup_dashfrog):
        """Test multiple flows executed sequentially."""
        mock_insert = setup_dashfrog

        with flow.start("flow1", tag="a"):
            pass

        with flow.start("flow2", tag="b"):
            pass

        # Should have 4 inserts (2 flows × 2 events each)
        assert mock_insert.call_count == 4

        # Verify flow1 events
        flow1_start = mock_insert.call_args_list[0]
        flow1_success = mock_insert.call_args_list[1]
        assert flow1_start[0][2]["flow_name"] == "flow1"
        assert flow1_start[0][2]["tag"] == "a"
        assert flow1_success[0][2]["tag"] == "a"

        # Verify flow2 events
        flow2_start = mock_insert.call_args_list[2]
        flow2_success = mock_insert.call_args_list[3]
        assert flow2_start[0][2]["flow_name"] == "flow2"
        assert flow2_start[0][2]["tag"] == "b"
        assert flow2_success[0][2]["tag"] == "b"

        # Verify different trace_ids
        assert flow1_start[0][0] != flow2_start[0][0]
