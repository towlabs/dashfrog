from datetime import UTC, datetime
from enum import Enum

from pydantic import BaseModel, Field

from opentelemetry.sdk.resources import LabelValue


class Status(str, Enum):
    WAITING = "WAITING"
    UNSET = "UNSET"
    SUCCESS = "SUCCESS"
    FAILED = "FAILED"


class Base(BaseModel):
    description: str | None = None
    labels: dict[str, LabelValue] = Field(default_factory=dict)

    status: Status = Status.UNSET
    status_message: str | None = None

    trace_id: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    started_at: datetime | None = None
    ended_at: datetime | None = None
    duration: int | None = None  # in ms

    @property
    def identifier(self) -> str:
        raise NotImplementedError()


class Flow(Base):
    service_name: str | None = None
    name: str

    @property
    def identifier(self) -> str:
        return self.name


class Step(Base):
    id: str

    name: str | None = None
    parent_id: str | None = None
    for_flow: str

    @property
    def identifier(self) -> str:
        return self.id
