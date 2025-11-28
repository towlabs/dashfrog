"""SQLAlchemy models for DashFrog."""

from datetime import datetime
from typing import Any, Literal, TypedDict
import uuid
from uuid import UUID

from sqlalchemy import BigInteger, Index, String, func
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy.types import UUID as SQLAlchemyUUID


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
    group_id: Mapped[str]
    tenant: Mapped[str]
    flow_metadata: Mapped[dict] = mapped_column(JSONB)


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
    type: Mapped[Literal["counter", "histogram", "gauge"]] = mapped_column(String, nullable=False)
    unit: Mapped[str]
    labels: Mapped[list[str]] = mapped_column(ARRAY(String))




class Notebook(Base):
    """Notebook model for tracking notebooks."""

    __tablename__ = "notebook"

    id: Mapped[UUID] = mapped_column(SQLAlchemyUUID(as_uuid=True), primary_key=True)
    title: Mapped[str]
    description: Mapped[str]
    blocks: Mapped[list[dict] | None] = mapped_column(ARRAY(JSONB), nullable=True)
    tenant: Mapped[str]
    filters: Mapped[list[dict[str, str]] | None] = mapped_column(JSONB, nullable=True)
    time_window: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    is_public: Mapped[bool] = mapped_column(default=False, server_default="false")
    flow_blocks_filters: Mapped[list[dict[str, Any]] | None] = mapped_column(JSONB, nullable=True)
    metric_blocks_filters: Mapped[list[dict[str, Any]] | None] = mapped_column(JSONB, nullable=True)


class Comment(Base):
    """Comments model for tracking comments."""

    __tablename__ = "comment"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    emoji: Mapped[str]
    title: Mapped[str]
    start: Mapped[datetime] 
    end: Mapped[datetime]