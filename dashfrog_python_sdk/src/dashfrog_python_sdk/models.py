"""SQLAlchemy models for DashFrog."""

from datetime import datetime
from typing import Literal

from sqlalchemy import BigInteger, Index, String, func
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    """Base class for all models."""

    pass


class FlowEvent(Base):
    """Event model for tracking flow/step events."""

    __tablename__ = "flow_event"
    __table_args__ = (
        # Use a BRIN index for time-ordered queries on event_dt
        Index("ix_flow_event_event_dt_brin", "event_dt", postgresql_using="brin"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    flow_id: Mapped[str]
    event_name: Mapped[str]
    event_dt: Mapped[datetime] = mapped_column(server_default=func.now())
    labels: Mapped[dict] = mapped_column(JSONB)


class Flow(Base):
    """
    Static view of flows and their labels.
    """

    __tablename__ = "flow"

    name: Mapped[str] = mapped_column(String, primary_key=True)
    labels: Mapped[list[str]] = mapped_column(ARRAY(String))


class Metric(Base):
    """
    Static view of metrics and their labels.
    """

    __tablename__ = "metric"

    name: Mapped[str] = mapped_column(String, primary_key=True)
    pretty_name: Mapped[str]
    type: Mapped[Literal["counter", "histogram"]] = mapped_column(String, nullable=False)
    unit: Mapped[str]
    default_aggregation: Mapped[str]
    labels: Mapped[list[str]] = mapped_column(ARRAY(String))


class TimelineEvent(Base):
    """Timeline event model for tracking business events with descriptions."""

    __tablename__ = "timeline_event"
    __table_args__ = (
        # Use a BRIN index for time-ordered queries on event_dt
        Index("ix_timeline_event_event_dt_brin", "event_dt", postgresql_using="brin"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    event_dt: Mapped[datetime] = mapped_column(server_default=func.now())
    event_name: Mapped[str]
    event_description: Mapped[str]
    labels: Mapped[dict] = mapped_column(JSONB)
