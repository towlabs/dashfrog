"""Tests for Flow registration."""

from sqlalchemy.orm import Session

from dashfrog import flow, get_dashfrog_instance
from dashfrog.models import Flow


class TestRegistration:
    """Test that Flow table is populated and dashfrog._flows cache is updated."""

    def test_flow_registration(self, setup_dashfrog):
        """Test that flows are registered in both database and cache."""
        dashfrog = get_dashfrog_instance()

        # Verify cache is empty initially
        assert len(dashfrog._flows) == 0

        # Start a flow with labels
        with flow.start("checkout_flow", tenant="test_tenant", region="us-east", tier="premium"):
            pass

        # Verify flow was added to cache
        assert "checkout_flow" in dashfrog._flows

        # Query database to verify flow was registered
        with Session(dashfrog.db_engine) as session:
            flows = session.query(Flow).all()

            # Verify flow was registered in database
            assert len(flows) == 1
            assert flows[0].name == "checkout_flow"
            assert set(flows[0].labels) == {"region", "tier"}
