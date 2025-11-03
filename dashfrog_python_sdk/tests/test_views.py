"""Tests for materialized views and refresh logic."""

import time
from unittest.mock import patch

from sqlalchemy.orm import Session

from dashfrog_python_sdk import flow, get_dashfrog_instance, refresh_views
from dashfrog_python_sdk.event import MIN_REFRESH_INTERVAL
from dashfrog_python_sdk.models import DashfrogMetadata, Flow, Label


class TestMaterializedViewRefresh:
    """Test materialized view refresh logic."""

    def test_refresh_called_when_stale(self, setup_dashfrog):
        """Test that refresh is automatically triggered when timestamp is stale."""
        dashfrog = get_dashfrog_instance()

        # Set last_refresh_ts to a time in the past (older than MIN_REFRESH_INTERVAL)
        stale_time = time.time() - MIN_REFRESH_INTERVAL - 10
        dashfrog.last_refresh_ts = stale_time

        # Mock refresh_views to track if it's called
        with patch("dashfrog_python_sdk.event.refresh_views") as mock_refresh:
            # Insert a flow event - this should trigger refresh
            with flow.start("test_flow", tenant="test_tenant", region="us-east"):
                pass

            # Verify refresh_views was called
            mock_refresh.assert_called_once_with(concurrent=True)

    def test_refresh_skipped_when_recent(self, setup_dashfrog):
        """Test that refresh is skipped when last refresh was recent."""
        dashfrog = get_dashfrog_instance()

        # Set last_refresh_ts to current time (very recent)
        recent_time = time.time()
        dashfrog.last_refresh_ts = recent_time

        # Mock refresh_views to track if it's called
        with patch("dashfrog_python_sdk.event.refresh_views") as mock_refresh:
            # Insert a flow event - this should NOT trigger refresh
            with flow.start("test_flow", tenant="test_tenant", region="us-west"):
                pass

            # Verify refresh_views was NOT called
            mock_refresh.assert_not_called()

    def test_refresh_updates_timestamp(self, setup_dashfrog):
        """Test that refresh updates both in-memory and database timestamps."""
        dashfrog = get_dashfrog_instance()

        # Set stale timestamp
        stale_time = time.time() - MIN_REFRESH_INTERVAL - 10
        dashfrog.last_refresh_ts = stale_time

        with dashfrog.db_engine.begin() as conn:
            from sqlalchemy import update

            stmt = update(DashfrogMetadata).where(DashfrogMetadata.id == 1).values(last_refresh_ts=stale_time)
            conn.execute(stmt)

        # Record time before insert
        time_before = time.time()

        # Insert flow event (should trigger refresh)
        with flow.start("test_flow", tenant="test_tenant"):
            pass

        # Verify in-memory timestamp was updated
        assert dashfrog.last_refresh_ts > stale_time
        assert dashfrog.last_refresh_ts >= time_before

        # Verify database timestamp was updated
        with Session(dashfrog.db_engine) as session:
            metadata = session.query(DashfrogMetadata).filter_by(id=1).one()
            assert metadata.last_refresh_ts > stale_time
            assert metadata.last_refresh_ts >= time_before


class TestMaterializedViewData:
    """Test that materialized views contain correct data."""

    def test_flow_view_contains_flows_and_steps(self, setup_dashfrog):
        """Test that Flow materialized view correctly aggregates flow names and steps."""
        dashfrog = get_dashfrog_instance()

        # Insert multiple flows with different steps
        with flow.start("checkout_flow", tenant="test_tenant"):
            pass

        with flow.start("payment_flow", tenant="test_tenant"):
            pass

        with flow.start("checkout_flow", tenant="test_tenant"):
            pass

        # Manually refresh views
        refresh_views()

        # Query Flow materialized view
        with Session(dashfrog.db_engine) as session:
            flows = session.query(Flow).order_by(Flow.name).all()

            # Should have 2 distinct flows
            assert len(flows) == 2

            # Verify flow names
            flow_names = [f.name for f in flows]
            assert "checkout_flow" in flow_names
            assert "payment_flow" in flow_names

    def test_label_view_contains_all_labels(self, setup_dashfrog):
        """Test that Label materialized view correctly aggregates all label keys and values."""
        dashfrog = get_dashfrog_instance()

        # Insert flows with various labels
        with flow.start("order_flow", tenant="acme", region="us-east", customer_tier="premium"):
            pass

        with flow.start("order_flow", tenant="globex", region="us-west", customer_tier="standard"):
            pass

        with flow.start("order_flow", tenant="acme", region="eu-west", customer_tier="premium"):
            pass

        # Manually refresh views
        refresh_views()

        # Query Label materialized view
        with Session(dashfrog.db_engine) as session:
            labels = {label.name: label.values for label in session.query(Label).all()}

            # Verify flow_name label
            assert "flow_name" in labels
            assert "order_flow" in labels["flow_name"]

            # Verify tenant label has both values
            assert "tenant" in labels
            assert set(labels["tenant"]) == {"acme", "globex"}

            # Verify region label has all three values
            assert "region" in labels
            assert set(labels["region"]) == {"us-east", "us-west", "eu-west"}

            # Verify customer_tier label
            assert "customer_tier" in labels
            assert set(labels["customer_tier"]) == {"premium", "standard"}

    def test_views_update_after_new_data(self, setup_dashfrog):
        """Test that views can be refreshed to include new data."""
        dashfrog = get_dashfrog_instance()

        # Insert initial flow
        with flow.start("initial_flow", tenant="test_tenant", environment="dev"):
            pass

        # Refresh views
        refresh_views()

        # Verify initial data
        with Session(dashfrog.db_engine) as session:
            flows = session.query(Flow).all()
            assert len(flows) == 1
            assert flows[0].name == "initial_flow"

            labels = {label.name: label.values for label in session.query(Label).all()}
            assert "environment" in labels
            assert labels["environment"] == ["dev"]

        # Insert new flow with new labels
        with flow.start("new_flow", tenant="test_tenant", environment="prod"):
            pass

        # Refresh views again
        refresh_views()

        # Verify updated data
        with Session(dashfrog.db_engine) as session:
            flows = session.query(Flow).order_by(Flow.name).all()
            assert len(flows) == 2
            flow_names = [f.name for f in flows]
            assert "initial_flow" in flow_names
            assert "new_flow" in flow_names

            labels = {label.name: label.values for label in session.query(Label).all()}
            assert "environment" in labels
            assert set(labels["environment"]) == {"dev", "prod"}
