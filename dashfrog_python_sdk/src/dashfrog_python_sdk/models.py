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
    """Flow model for tracking business flows."""

    __tablename__ = "flow"

    name: Mapped[str] = mapped_column(String, primary_key=True)
    steps: Mapped[list[str]] = mapped_column(ARRAY(String))


class Label(Base):
    """Label model for tracking flow/step labels."""

    __tablename__ = "label"

    name: Mapped[str] = mapped_column(String, primary_key=True)
    values: Mapped[list[str]] = mapped_column(ARRAY(String))
