"""Timeline event tracking for business events with descriptions."""

from sqlalchemy import insert as sa_insert

from .dashfrog import get_dashfrog_instance
from .models import TimelineEvent


def add(event_name: str, event_description: str, **labels: str) -> None:
    """
    Add a timeline event to the database.

    Timeline events are business events with human-readable descriptions
    that can be displayed in a timeline view.

    Usage:
        from dashfrog_python_sdk import timeline

        timeline.add(
            "order_placed",
            "Customer John Doe placed order #12345",
            customer_id="12345",
            order_id="ORD-12345",
            tenant="acme-corp"
        )

    Args:
        event_name: The event type/category (e.g., "order_placed", "payment_completed")
        event_description: Human-readable description of the event
        **labels: Additional labels/metadata for the event
    """
    dashfrog = get_dashfrog_instance()

    # Insert using SQLAlchemy Core
    stmt = sa_insert(TimelineEvent).values(
        event_name=event_name,
        event_description=event_description,
        labels=dict(labels),
    )
    with dashfrog.db_engine.begin() as conn:
        conn.execute(stmt)
