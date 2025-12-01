"""Tests for timeline tracking."""

from sqlalchemy.orm import Session

from dashfrog_python_sdk import get_dashfrog_instance, timeline
from dashfrog_python_sdk.models import TimelineEvent


class TestTimelineAdd:
    """Test timeline.add() function."""

    def test_add_timeline_event(self, setup_dashfrog):
        """Test adding a timeline event with labels."""
        # Add a timeline event
        timeline.add(
            "order_placed",
            "🛒",
            customer_id="12345",
            order_id="ORD-12345",
            tenant="acme-corp",
        )

        # Query database to verify event was inserted
        dashfrog = get_dashfrog_instance()
        with Session(dashfrog.db_engine) as session:
            events = session.query(TimelineEvent).all()

            # Verify 1 event was inserted
            assert len(events) == 1

            event = events[0]
            assert event.event_name == "order_placed"
            assert event.emoji == "🛒"
            assert event.labels == {
                "customer_id": "12345",
                "order_id": "ORD-12345",
                "tenant": "acme-corp",
            }
            assert event.event_dt is not None
            assert event.id is not None
