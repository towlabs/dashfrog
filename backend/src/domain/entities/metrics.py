from enum import Enum

from pydantic import BaseModel


class Kind(str, Enum):
    counter = "counter"
    measure = "measure"
    stats = "stats"
    over = "over"


class Metric(BaseModel):
    id: int
    key: str
    kind: Kind
    scope: str
    unit: str
    display_as: str
    description: str
    associated_identifiers: list[str] = []
    labels: list[int] = []
