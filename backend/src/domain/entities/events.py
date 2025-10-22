from datetime import datetime
from enum import Enum

from pydantic import BaseModel


class Kind(str, Enum):
    incident = "incident"
    maintenance = "maintenance"


class Event(BaseModel):
    id: int
    title: str
    description: str | None = None
    kind: Kind
    labels: dict[str, str] = {}
    started_at: datetime
    ended_at: datetime
