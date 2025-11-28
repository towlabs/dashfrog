"""Pydantic schemas for API responses."""

from datetime import datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, Field


class LabelFilter(BaseModel):
    """A single label filter with key and value."""

    label: str
    value: str


class Label(BaseModel):
    """A single label with key and value."""

    label: str
    values: list[str]


class FlowResponse(BaseModel):
    """Response for listing flows."""

    name: str
    groupId: str
    labels: dict[str, str]
    lastRunStatus: Literal["success", "failure", "running"]
    lastRunStartedAt: datetime
    lastRunEndedAt: datetime | None
    runCount: int
    successCount: int
    pendingCount: int
    failedCount: int
    lastDurationInSeconds: float | None
    avgDurationInSeconds: float | None
    maxDurationInSeconds: float | None
    minDurationInSeconds: float | None


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
    groupId: str
    startTime: datetime
    endTime: datetime | None
    status: Literal["success", "failure", "running"]
    labels: dict[str, str]
    events: list[FlowHistoryEvent]
    steps: list[FlowHistoryStep]


TransformT = Literal[
    "ratePerSecond",
    "ratePerMinute",
    "ratePerHour",
    "ratePerDay",
    "p50",
    "p90",
    "p95",
    "p99",
]
TimeAggregationT = Literal["last", "avg", "min", "max", "match"]
GroupByFnT = Literal["sum", "avg", "min", "max"]


class RangeMetricResponse(BaseModel):
    """A single range metric."""

    prometheusName: str
    prettyName: str
    type: Literal["counter", "histogram", "gauge"]
    unit: str | None
    labels: list[str]
    transform: TransformT | None
    groupBy: list[GroupByFnT]


class InstantMetricResponse(BaseModel):
    """A single instant metric."""

    prometheusName: str
    prettyName: str
    type: Literal["counter", "histogram", "gauge"]
    unit: str | None
    labels: list[str]
    transform: TransformT | None
    groupBy: list[GroupByFnT]
    timeAggregation: list[TimeAggregationT]


class RangeMetricRequest(BaseModel):
    """Request body for getting instant metric value."""

    metric_name: str
    transform: TransformT | None
    start_time: datetime
    end_time: datetime
    labels: list[LabelFilter] = Field(default_factory=list)
    group_by: list[str]
    group_fn: GroupByFnT
    notebook_id: UUID | None



class InstantMetricRequest(BaseModel):
    metric_name: str
    transform: TransformT | None = None
    time_aggregation: TimeAggregationT
    group_by: list[str]
    group_fn: GroupByFnT
    start_time: datetime
    end_time: datetime
    labels: list[LabelFilter] = Field(default_factory=list)
    match_operator: Literal["==", "!=", ">=", "<=", ">", "<"] | None = None
    match_value: float | None = None
    notebook_id: UUID


class PrometheusDataPoint(BaseModel):
    """A single Prometheus data point."""

    metric: dict[str, str]
    value: list  # [timestamp, value_string]


class InstantMetric(BaseModel):
    """Response for instant metric query."""

    labels: dict[str, str]
    value: float


class DataPoint(BaseModel):
    """A single data point."""

    timestamp: datetime
    value: float


class RangeMetric(BaseModel):
    """Response for range metric query."""

    labels: dict[str, str]
    values: list[DataPoint]


class BaseNotebook(BaseModel):
    """Base notebook."""

    id: UUID
    title: str
    description: str
    blocks: list[dict] | None


class BlockFilters(BaseModel):
    """Block filters."""

    filters: list[LabelFilter]
    names: list[str]

    @staticmethod
    def parse_from_dict(data: dict[str, Any]) -> "BlockFilters":
        return BlockFilters(filters=[LabelFilter(**filter) for filter in data["filters"]], names=data["names"])

class SerializedNotebook(BaseNotebook):
    """Serialized notebook."""

    filters: list[dict[str, str]] | None
    timeWindow: dict[str, Any] | None
    flowBlocksFilters: list[BlockFilters] | None
    metricBlocksFilters: list[BlockFilters] | None
    isPublic: bool


class CreateNotebookRequest(BaseModel):
    """Request body for creating a notebook."""

    tenant: str
    notebook: BaseNotebook


class CommentResponse(BaseModel):
    """Response for comment."""

    id: int
    emoji: str
    title: str
    start: datetime
    end: datetime


class CreateCommentRequest(BaseModel):
    """Request body for creating a comment."""

    emoji: str
    title: str
    start: datetime
    end: datetime
