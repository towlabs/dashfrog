from datetime import UTC, datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql.sqltypes import ARRAY, Enum

from src.domain import entities

from . import Base


class LabelValue(Base):
    __tablename__ = "label_values"

    label_id: Mapped[str] = mapped_column(Integer, ForeignKey("labels.id", ondelete="CASCADE"), primary_key=True)
    value: Mapped[str] = mapped_column(String, nullable=False, primary_key=True)
    mapped_to: Mapped[str | None] = mapped_column(String, nullable=True)

    def to_entity(self) -> entities.Label.Value:
        return entities.Label.Value(
            value=self.value,
            mapped_to=self.mapped_to,
        )


class LabelUsage(Base):
    __tablename__ = "label_usage"

    label_id: Mapped[int] = mapped_column(Integer, ForeignKey("labels.id", ondelete="CASCADE"), primary_key=True)
    _used_in: Mapped[str] = mapped_column("used_in", String, primary_key=True)
    kind: Mapped[entities.LabelSrcKind] = mapped_column(
        Enum(entities.LabelSrcKind, name="label_src_kind"), nullable=False
    )

    @property
    def used_in(self) -> str | int:
        if self.kind == entities.LabelSrcKind.metrics:
            return int(self._used_in)

        return self._used_in

    def to_entity(self) -> entities.Label.Usage:
        return entities.Label.Usage(
            used_in=self.used_in,
            kind=self.kind,
        )


class Label(Base):
    __tablename__ = "labels"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    label: Mapped[str] = mapped_column(String, nullable=False, unique=True)
    description: Mapped[str | None] = mapped_column(String, nullable=True)

    values: Mapped[list["LabelValue"]] = relationship(cascade="all, delete-orphan", lazy="selectin")
    used_in: Mapped[list["LabelUsage"]] = relationship(cascade="all, delete-orphan", lazy="selectin")

    def to_entity(self) -> entities.Label:
        return entities.Label(
            id=self.id,
            label=self.label,
            description=self.description,
            values=[value.to_entity() for value in self.values],
            used_in=[usage.to_entity() for usage in self.used_in],
        )


class Metric(Base):
    __tablename__ = "metrics"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    key: Mapped[str] = mapped_column(String, nullable=False, unique=True)
    kind: Mapped[entities.MetricKind] = mapped_column(Enum(entities.MetricKind, name="metric_kind"), nullable=False)
    scope: Mapped[str] = mapped_column(String, nullable=False)
    display_as: Mapped[str | None] = mapped_column(String, unique=True)
    description: Mapped[str | None] = mapped_column(String)
    unit: Mapped[str | None] = mapped_column(String)
    associated_identifiers: Mapped[list[str] | None] = mapped_column(ARRAY(String))

    def to_entity(self) -> entities.Metric:
        return entities.Metric(
            id=self.id,
            key=self.key,
            kind=self.kind,
            scope=self.scope,
            unit=self.unit or "",
            display_as=self.display_as or "",
            description=self.description or "",
            associated_identifiers=self.associated_identifiers or [],
        )


class LabelsScrapped(Base):
    __tablename__ = "labels_scrapped"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    ran_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, unique=True, default=lambda: datetime.now(UTC))
