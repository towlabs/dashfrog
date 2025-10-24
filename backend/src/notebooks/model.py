from datetime import UTC, datetime

from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.stores import Base

from .entities import (
    Block as BlockEntity,
    Note as NoteEntity,
)


class Block(Base):
    __tablename__ = "blocks"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    note_id: Mapped[int] = mapped_column(Integer, ForeignKey("notes.id", ondelete="CASCADE"))
    kind: Mapped[str] = mapped_column(String, nullable=False)  # Python: kind, DB: kind, API: type
    content: Mapped[dict] = mapped_column(JSON, nullable=False)
    position: Mapped[int] = mapped_column(Integer, nullable=False)

    note: Mapped["Note"] = relationship(back_populates="blocks")

    def to_entity(self) -> BlockEntity:
        return BlockEntity(
            id=self.id,
            kind=self.kind,
            content=self.content,
            position=self.position,
        )


class Note(Base):
    __tablename__ = "notes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str | None] = mapped_column(String, nullable=True)
    locked: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(UTC)
    )

    blocks: Mapped[list["Block"]] = relationship(
        back_populates="note",
        cascade="all, delete-orphan",
        lazy="selectin",
        order_by="Block.position",
    )

    def to_entity(self) -> NoteEntity:
        return NoteEntity(
            id=self.id,
            title=self.title,
            description=self.description,
            locked=self.locked,
            blocks=[block.to_entity() for block in self.blocks],
        )
