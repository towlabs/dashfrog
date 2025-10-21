from datetime import UTC, datetime
from enum import Enum
from typing import Annotated

from pydantic import BaseModel, BeforeValidator, Field

from . import time

from opentelemetry.sdk.resources import LabelValue


class Status(str, Enum):
    WAITING = "WAITING"
    UNSET = "UNSET"
    SUCCESS = "SUCCESS"
    FAILED = "FAILED"


class Base(BaseModel):
    name: str | None = None
    description: str | None = None
    labels: dict[str, LabelValue] = Field(default_factory=dict)

    status: Status = Status.UNSET
    status_message: str | None = None

    trace_id: str
    created_at: Annotated[
        datetime, Field(default_factory=lambda: datetime.now(UTC)), BeforeValidator(time.Converts.to_utc)
    ]
    started_at: Annotated[datetime | None, BeforeValidator(lambda x: time.Converts.to_utc(x) if x else None)] = None
    ended_at: Annotated[datetime | None, BeforeValidator(lambda x: time.Converts.to_utc(x) if x else None)] = None
    duration: int | None = None  # in ms

    @property
    def identifier(self) -> str:
        raise NotImplementedError()


class Flow(Base):
    service_name: str | None = None
    name: str  # type: ignore[reportIncompatibleVariableOverride] str | None becomes str witch is incompatible but stricter so does not lead to any issues.

    @property
    def identifier(self) -> str:
        return self.name


class Step(Base):
    id: str

    parent_id: str | None = None
    for_flow: str

    @property
    def identifier(self) -> str:
        return self.id
