"""Timeline event tracking for business events with descriptions."""

from sqlalchemy import insert

from .dashfrog import get_dashfrog_instance
from .models import TimelineEvent


def add(event_name: str, emoji: str, tenant: str, **labels: str) -> None:
    """
    Add a timeline event to the database.

    Timeline events are business events with human-readable descriptions
    that can be displayed in a timeline view.

    Usage:
        from dashfrog_python_sdk import timeline

        timeline.add(
            "order_placed",
            "🛒",
            customer_id="12345",
            order_id="ORD-12345",
            tenant="acme-corp"
        )

    Args:
        event_name: The event type/category (e.g., "order_placed", "payment_completed")
        emoji: Emoji representing the event
        tenant: The tenant context of the event
        **labels: Additional labels/metadata for the event
    """
    dashfrog = get_dashfrog_instance()

    # Insert using SQLAlchemy Core
    stmt = insert(TimelineEvent).values(
        event_name=event_name,
        emoji=emoji,
        labels=dict(labels, tenant=tenant),
    )
    with dashfrog.db_engine.begin() as conn:
        conn.execute(stmt)
