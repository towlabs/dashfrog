"""Pydantic schemas for API responses."""

from pydantic import BaseModel


class Label(BaseModel):
    label: str
    values: list[str]


class HealthResponse(BaseModel):
    """Health check response."""

    status: str


class FlowListResponse(BaseModel):
    """Response for listing flows."""

    flows: list[str]


class FlowDetailResponse(BaseModel):
    """Response for getting a specific flow."""

    flow_id: str


class TimelineListResponse(BaseModel):
    """Response for listing timelines."""

    timelines: list[str]


class TimelineDetailResponse(BaseModel):
    """Response for getting a specific timeline."""

    timeline_id: str
