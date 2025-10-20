from enum import Enum
from typing import TypedDict

from pydantic import BaseModel, Field


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

    values: list[Value] = []
    used_in: list[Usage] = []


class LabelScrappingValue(TypedDict):
    values: list[str]
    used_in: list[str]


LabelScrapping = dict[str, LabelScrappingValue]
