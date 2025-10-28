"""Facets (Metrics and Labels) models and entities."""

from datetime import UTC, datetime
from enum import Enum
from typing import TypedDict

from pydantic import BaseModel, Field
from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql.sqltypes import (
    ARRAY,
    Boolean,
    Enum as SQLEnum,
)

from .base import Base


class MetricKind(str, Enum):
    """Metric type enumeration."""

    events = "events"
    values = "values"
    distribution = "distribution"


class LabelSrcKind(str, Enum):
    """Label source kind enumeration."""

    workflow = "workflow"
    metrics = "metrics"


class MetricEntity(BaseModel):
    """Pydantic entity for Metric."""

    id: int
    key: str
    kind: MetricKind
    scope: str
    unit: str
    display_as: str
    description: str
    associated_identifiers: list[str] = []
    labels: list[int] = []


class LabelValueEntity(BaseModel):
    """Pydantic entity for Label Value."""

    value: str
    mapped_to: str | None = None


class LabelUsageEntity(BaseModel):
    """Pydantic entity for Label Usage."""

    used_in: int | str
    kind: LabelSrcKind


class LabelEntity(BaseModel):
    """Pydantic entity for Label."""

    id: int = Field(..., frozen=True)
    label: str
    description: str | None = None
    display_as: str | None = None
    hide: bool = False
    values: list[LabelValueEntity] = []
    used_in: list[LabelUsageEntity] = []


class LabelScrappingValue(TypedDict):
    """Type definition for label scrapping value."""

    values: list[str]
    used_in: list[str]


LabelScrapping = dict[str, LabelScrappingValue]


class LabelValue(Base):
    """SQLAlchemy model for label values."""

    __tablename__ = "label_values"

    label_id: Mapped[str] = mapped_column(Integer, ForeignKey("labels.id", ondelete="CASCADE"), primary_key=True)
    value: Mapped[str] = mapped_column(String, nullable=False, primary_key=True)
    mapped_to: Mapped[str | None] = mapped_column(String, nullable=True)

    def to_entity(self) -> LabelValueEntity:
        """Convert SQLAlchemy model to Pydantic entity."""
        return LabelValueEntity(
            value=self.value,
            mapped_to=self.mapped_to,
        )


class LabelUsage(Base):
    """SQLAlchemy model for label usage tracking."""

    __tablename__ = "label_usage"

    label_id: Mapped[int] = mapped_column(Integer, ForeignKey("labels.id", ondelete="CASCADE"), primary_key=True)
    _used_in: Mapped[str] = mapped_column("used_in", String, primary_key=True)
    kind: Mapped[LabelSrcKind] = mapped_column(SQLEnum(LabelSrcKind, name="label_src_kind"), nullable=False)

    @property
    def used_in(self) -> str | int:
        """Get the used_in value, converting to int for metrics."""
        if self.kind == LabelSrcKind.metrics:
            return int(self._used_in)

        return self._used_in

    def to_entity(self) -> LabelUsageEntity:
        """Convert SQLAlchemy model to Pydantic entity."""
        return LabelUsageEntity(
            used_in=self.used_in,
            kind=self.kind,
        )


class Label(Base):
    """SQLAlchemy model for labels."""

    __tablename__ = "labels"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    label: Mapped[str] = mapped_column(String, nullable=False, unique=True)
    description: Mapped[str | None] = mapped_column(String, nullable=True)
    display_as: Mapped[str | None] = mapped_column(String, unique=True)
    hide: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    values: Mapped[list["LabelValue"]] = relationship(cascade="all, delete-orphan", lazy="selectin")
    used_in: Mapped[list["LabelUsage"]] = relationship(cascade="all, delete-orphan", lazy="selectin")

    def to_entity(self) -> LabelEntity:
        """Convert SQLAlchemy model to Pydantic entity."""
        return LabelEntity(
            id=self.id,
            label=self.label,
            description=self.description,
            values=[value.to_entity() for value in self.values],
            used_in=[usage.to_entity() for usage in self.used_in],
            display_as=self.display_as,
            hide=self.hide,
        )


class Metric(Base):
    """SQLAlchemy model for metrics."""

    __tablename__ = "metrics"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    key: Mapped[str] = mapped_column(String, nullable=False, unique=True)
    kind: Mapped[MetricKind] = mapped_column(SQLEnum(MetricKind, name="metric_kind"), nullable=False)
    scope: Mapped[str] = mapped_column(String, nullable=False)
    display_as: Mapped[str | None] = mapped_column(String, unique=True)
    description: Mapped[str | None] = mapped_column(String)
    unit: Mapped[str | None] = mapped_column(String)
    associated_identifiers: Mapped[list[str] | None] = mapped_column(ARRAY(String))

    def to_entity(self) -> MetricEntity:
        """Convert SQLAlchemy model to Pydantic entity."""
        return MetricEntity(
            id=self.id,
            key=self.key,
            kind=self.kind,
            scope=self.scope,
            unit=self.unit or "",
            display_as=self.display_as or "",
            description=self.description or "",
            associated_identifiers=self.associated_identifiers or [],
        )


class MetricsScrapped(Base):
    """SQLAlchemy model for tracking metric scrape timestamps."""

    __tablename__ = "metrics_scrapped"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    ran_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, unique=True, default=lambda: datetime.now(UTC))
