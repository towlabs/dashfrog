"""Notebook models and entities."""

from datetime import datetime
from typing import Literal, TypedDict

from sqlalchemy import JSON, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base


class BlockNote(Base):
    """Simple SQLAlchemy model for block notes with just id and content."""

    __tablename__ = "blocknote"

    uuid: Mapped[str] = mapped_column(primary_key=True)
    content: Mapped[list[dict]] = mapped_column(JSON)

    # Relationship back to notebooks
    notebooks: Mapped[list["Notebook"]] = relationship(back_populates="blocknote", lazy="selectin")


type RelativeTimeValue = Literal["15m", "1h", "6h", "12h", "24h", "7d", "30d", "w"]


class RelativeTimeWindowMetadata(TypedDict):
    value: RelativeTimeValue


class AbsoluteTimeWindowMetadata(TypedDict):
    start: datetime
    end: datetime


class RelativeTimeWindow(TypedDict):
    type: Literal["relative"]
    metadata: RelativeTimeWindowMetadata


class AbsoluteTimeWindow(TypedDict):
    type: Literal["absolute"]
    metadata: AbsoluteTimeWindowMetadata


class Notebook(Base):
    """SQLAlchemy model for notebooks."""

    __tablename__ = "note"

    uuid: Mapped[str] = mapped_column(primary_key=True)
    title: Mapped[str]
    description: Mapped[str | None]
    locked: Mapped[bool] = mapped_column(default=False)
    created_at: Mapped[datetime] = mapped_column(default=datetime.now)
    blocknote_uuid: Mapped[str] = mapped_column(ForeignKey("blocknote.uuid"))
    time_window: Mapped[RelativeTimeWindow | AbsoluteTimeWindow] = mapped_column(JSON)

    # Relationship to blocknote
    blocknote: Mapped["BlockNote"] = relationship(back_populates="notebooks", lazy="selectin")
