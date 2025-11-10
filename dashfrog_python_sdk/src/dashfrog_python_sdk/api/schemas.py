"""Pydantic schemas for API responses."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel


class Label(BaseModel):
    label: str
    values: list[str]


class FlowResponse(BaseModel):
    """Response for listing flows."""

    name: str
    labels: dict[str, str]
    lastRunStatus: Literal["success", "failure", "running"]
    lastRunStartedAt: datetime
    lastRunEndedAt: datetime | None
    runCount: int
    successCount: int
    pendingCount: int
    failedCount: int


class FlowHistoryEvent(BaseModel):
    """A single event in flow history."""

    eventName: str
    eventDt: datetime


class FlowHistoryStep(BaseModel):
    """A single step in flow history."""

    name: str
    startTime: datetime
    endTime: datetime | None
    status: Literal["success", "failure", "running"]


class FlowHistory(BaseModel):
    """History of a single flow run."""

    flowId: str
    startTime: datetime
    endTime: datetime | None
    status: Literal["success", "failure", "running"]
    events: list[FlowHistoryEvent]
    steps: list[FlowHistoryStep]


class FlowDetailResponse(BaseModel):
    """Response for getting flow details with history."""

    name: str
    labels: dict[str, str]
    lastRunStatus: Literal["success", "failure", "running"]
    lastRunStartedAt: datetime
    lastRunEndedAt: datetime | None
    runCount: int
    successCount: int
    pendingCount: int
    failedCount: int
    history: list[FlowHistory]
