from datetime import datetime
from enum import Enum

from pydantic import BaseModel


class EventKind(str, Enum):
    incident = "incident"
    maintenance = "maintenance"


class Event(BaseModel):
    id: int
    title: str
    description: str | None = None
    kind: EventKind
    labels: dict[str, str] = {}
    started_at: datetime
    ended_at: datetime