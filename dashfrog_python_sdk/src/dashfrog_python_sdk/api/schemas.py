"""Pydantic schemas for API responses."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel


class Label(BaseModel):
    label: str
    values: list[str]


class HealthResponse(BaseModel):
    """Health check response."""

    status: str


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


class FlowDetailResponse(BaseModel):
    """Response for getting a specific flow."""

    flow_id: str


class TimelineListResponse(BaseModel):
    """Response for listing timelines."""

    timelines: list[str]


class TimelineDetailResponse(BaseModel):
    """Response for getting a specific timeline."""

    timeline_id: str
