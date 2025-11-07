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
            "Customer John Doe placed order #12345",
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
            assert event.event_description == "Customer John Doe placed order #12345"
            assert event.labels == {
                "customer_id": "12345",
                "order_id": "ORD-12345",
                "tenant": "acme-corp",
            }
            assert event.event_dt is not None
            assert event.id is not None

    def test_add_multiple_timeline_events(self, setup_dashfrog):
        """Test adding multiple timeline events."""
        # Add multiple timeline events
        timeline.add(
            "payment_initiated",
            "Payment of $99.99 initiated",
            amount="99.99",
            currency="USD",
            tenant="acme-corp",
        )
        timeline.add(
            "payment_completed",
            "Payment successfully processed",
            amount="99.99",
            currency="USD",
            tenant="acme-corp",
        )
        timeline.add(
            "email_sent",
            "Confirmation email sent to customer",
            email_type="order_confirmation",
            tenant="acme-corp",
        )

        # Query database
        dashfrog = get_dashfrog_instance()
        with Session(dashfrog.db_engine) as session:
            events = session.query(TimelineEvent).order_by(TimelineEvent.id).all()

            # Verify 3 events were inserted
            assert len(events) == 3

            # Verify first event
            assert events[0].event_name == "payment_initiated"
            assert events[0].event_description == "Payment of $99.99 initiated"
            assert events[0].labels["amount"] == "99.99"
            assert events[0].labels["currency"] == "USD"

            # Verify second event
            assert events[1].event_name == "payment_completed"
            assert events[1].event_description == "Payment successfully processed"

            # Verify third event
            assert events[2].event_name == "email_sent"
            assert events[2].event_description == "Confirmation email sent to customer"
            assert events[2].labels["email_type"] == "order_confirmation"

    def test_add_event_without_labels(self, setup_dashfrog):
        """Test adding a timeline event without any labels."""
        # Add event without labels
        timeline.add(
            "system_startup",
            "System started successfully",
        )

        # Query database
        dashfrog = get_dashfrog_instance()
        with Session(dashfrog.db_engine) as session:
            events = session.query(TimelineEvent).all()

            assert len(events) == 1
            assert events[0].event_name == "system_startup"
            assert events[0].event_description == "System started successfully"
            assert events[0].labels == {}

    def test_add_event_with_special_characters(self, setup_dashfrog):
        """Test adding a timeline event with special characters in description."""
        # Add event with special characters
        timeline.add(
            "error_occurred",
            "Error: Unable to process request - 'invalid_input' @ line 42",
            error_code="ERR-500",
            severity="high",
            tenant="test-tenant",
        )

        # Query database
        dashfrog = get_dashfrog_instance()
        with Session(dashfrog.db_engine) as session:
            events = session.query(TimelineEvent).all()

            assert len(events) == 1
            assert events[0].event_name == "error_occurred"
            assert events[0].event_description == "Error: Unable to process request - 'invalid_input' @ line 42"
            assert events[0].labels["error_code"] == "ERR-500"
            assert events[0].labels["severity"] == "high"

    def test_timeline_events_ordered_by_time(self, setup_dashfrog):
        """Test that timeline events are ordered by event_dt."""
        import time

        # Add events with small delays
        timeline.add("event_1", "First event", sequence="1", tenant="test")
        time.sleep(0.01)
        timeline.add("event_2", "Second event", sequence="2", tenant="test")
        time.sleep(0.01)
        timeline.add("event_3", "Third event", sequence="3", tenant="test")

        # Query database ordered by event_dt
        dashfrog = get_dashfrog_instance()
        with Session(dashfrog.db_engine) as session:
            events = session.query(TimelineEvent).order_by(TimelineEvent.event_dt).all()

            assert len(events) == 3
            assert events[0].labels["sequence"] == "1"
            assert events[1].labels["sequence"] == "2"
            assert events[2].labels["sequence"] == "3"

            # Verify timestamps are in order
            assert events[0].event_dt <= events[1].event_dt <= events[2].event_dt
