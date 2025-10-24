from enum import Enum
from typing import TypedDict

from pydantic import BaseModel, Field


class MetricKind(str, Enum):
    counter = "counter"
    measure = "measure"
    stats = "stats"
    other = "other"


class Metric(BaseModel):
    id: int
    key: str
    kind: MetricKind
    scope: str
    unit: str
    display_as: str
    description: str
    associated_identifiers: list[str] = []
    labels: list[int] = []


class LabelSrcKind(str, Enum):
    workflow = "workflow"
    metrics = "metrics"


class Label(BaseModel):
    class Value(BaseModel):
        value: str
        mapped_to: str | None = None

    class Usage(BaseModel):
        used_in: int | str
        kind: LabelSrcKind

    id: int = Field(..., frozen=True)
    label: str
    description: str | None = None
    display_as: str | None = None
    hide: bool = False

    values: list[Value] = []
    used_in: list[Usage] = []


class LabelScrappingValue(TypedDict):
    values: list[str]
    used_in: list[str]


LabelScrapping = dict[str, LabelScrappingValue]