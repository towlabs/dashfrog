"""Event models and entities."""

from datetime import datetime
from enum import Enum

from pydantic import BaseModel
from sqlalchemy import JSON
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base


class EventKind(str, Enum):
    """Event type enumeration."""

    incident = "incident"
    maintenance = "maintenance"


class EventEntity(BaseModel):
    """Pydantic entity for Event."""

    id: int
    title: str
    description: str | None = None
    kind: EventKind
    labels: dict[str, str] = {}
    started_at: datetime
    ended_at: datetime


class Event(Base):
    """SQLAlchemy model for events."""

    __tablename__ = "event"

    uuid: Mapped[str] = mapped_column(primary_key=True)
    title: Mapped[str]
    description: Mapped[str | None]
    kind: Mapped[str]
    labels: Mapped[dict[str, str]] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(default=datetime.now)
    started_at: Mapped[datetime]
    ended_at: Mapped[datetime]

    def to_entity(self) -> EventEntity:
        """Convert SQLAlchemy model to Pydantic entity."""
        return EventEntity(
            id=self.id,
            title=self.title,
            description=self.description,
            kind=EventKind(self.kind),
            labels=self.labels,
            started_at=self.started_at,
            ended_at=self.ended_at,
        )
