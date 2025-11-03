"""SQLAlchemy models for DashFrog."""

from datetime import datetime

from sqlalchemy import BigInteger, Index, String, func
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    """Base class for all models."""

    pass


class Event(Base):
    """Event model for tracking flow/step events."""

    __tablename__ = "event"
    __table_args__ = (
        # Use a BRIN index for time-ordered queries on event_dt
        Index("ix_event_event_dt_brin", "event_dt", postgresql_using="brin"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    flow_id: Mapped[str]
    event_name: Mapped[str]
    event_dt: Mapped[datetime] = mapped_column(server_default=func.now())
    labels: Mapped[dict] = mapped_column(JSONB)


class Flow(Base):
    """
    Materialized view of flows derived from Event table.

    This is not a regular table - it's a materialized view that aggregates
    flow names and their steps from the event data. The view is created
    and managed by Alembic migrations.

    Flow name is extracted from: labels->>'dashfrog.flow.flow_name'
    Steps are extracted from: labels->>'dashfrog.flow.step_name'

    To refresh: REFRESH MATERIALIZED VIEW CONCURRENTLY flow;
    """

    __tablename__ = "flow"
    __table_args__ = {"info": {"is_view": True}}

    name: Mapped[str] = mapped_column(String, primary_key=True)
    steps: Mapped[list[str]] = mapped_column(ARRAY(String))


class Label(Base):
    """
    Materialized view of labels derived from Event table.

    This is not a regular table - it's a materialized view that aggregates
    all label keys and their possible values from the event data.
    The view is created and managed by Alembic migrations.

    To refresh: REFRESH MATERIALIZED VIEW CONCURRENTLY label;
    """

    __tablename__ = "label"
    __table_args__ = {"info": {"is_view": True}}

    name: Mapped[str] = mapped_column(String, primary_key=True)
    values: Mapped[list[str]] = mapped_column(ARRAY(String))


class DashfrogMetadata(Base):
    """
    Metadata table for tracking DashFrog internal state.

    This table stores metadata about the DashFrog system itself,
    such as the last time materialized views were refreshed.

    Currently tracks:
    - last_refresh_at: Timestamp of the last materialized view refresh
    """

    __tablename__ = "dashfrog_metadata"

    id: Mapped[int] = mapped_column(primary_key=True)
    last_refresh_ts: Mapped[float | None]
