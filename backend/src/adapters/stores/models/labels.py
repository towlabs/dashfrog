from datetime import UTC, datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import relationship
from sqlalchemy.sql.sqltypes import Enum

from domain import entities

from . import Base


class LabelValue(Base):
    __tablename__ = "label_values"

    label_id = Column(Integer, ForeignKey("labels.id", ondelete="CASCADE"), primary_key=True)
    value = Column(String, nullable=False, primary_key=True)
    mapped_to = Column(String, nullable=True)

    def to_entity(self) -> entities.Label.Value:
        return entities.Label.Value(
            value=self.value,
            mapped_to=self.mapped_to,
        )


class LabelUsage(Base):
    __tablename__ = "label_usage"

    label_id = Column(Integer, ForeignKey("labels.id", ondelete="CASCADE"), primary_key=True)
    used_in = Column(String, nullable=False, primary_key=True)
    kind = Column(Enum(entities.LabelSrcKind, name="label_src_kind"), nullable=False)

    def to_entity(self) -> entities.Label.Usage:
        return entities.Label.Usage(
            used_in=self.used_in,
            kind=self.kind,
        )


class Label(Base):
    __tablename__ = "labels"

    id = Column(Integer, primary_key=True)
    label = Column(String, nullable=False, unique=True)
    description = Column(String, nullable=True)

    values = relationship("LabelValue", cascade="all, delete-orphan", lazy="selectin")
    used_in = relationship("LabelUsage", cascade="all, delete-orphan", lazy="selectin")

    def to_entity(self) -> entities.Label:
        return entities.Label(
            id=self.id,
            label=self.label,
            description=self.description,
            values=[value.to_entity() for value in self.values],
            used_in=[usage.to_entity() for usage in self.used_in],
        )


class LabelsScrapped(Base):
    __tablename__ = "labels_scrapped"

    id = Column(Integer, primary_key=True)
    ran_at = Column(DateTime, nullable=False, unique=True, default=lambda: datetime.now(UTC))
