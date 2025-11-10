"""Pydantic schemas for API responses."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class LabelFilter(BaseModel):
    """A single label filter with key and value."""

    key: str
    value: str


class Label(BaseModel):
    """A single label with key and value."""

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


class StatisticResponse(BaseModel):
    """Response for listing statistics."""

    name: str
    prettyName: str
    type: Literal["counter", "histogram"]
    unit: str | None
    defaultAggregation: str
    labels: list[str]


class StatisticRequest(BaseModel):
    """Request body for getting instant statistic value."""

    statistic_name: str
    start_time: datetime
    end_time: datetime
    labels: list[LabelFilter] = Field(default_factory=list)


class PrometheusDataPoint(BaseModel):
    """A single Prometheus data point."""

    statistic: dict[str, str]
    value: list  # [timestamp, value_string]


class InstantStatistic(BaseModel):
    """Response for instant statistic query."""

    statistic_name: str
    labels: dict[str, str]
    value: float


class DataPoint(BaseModel):
    """A single data point."""

    timestamp: datetime
    value: float


class RangeStatistic(BaseModel):
    """Response for range statistic query."""

    statistic_name: str
    labels: dict[str, str]
    values: list[DataPoint]
