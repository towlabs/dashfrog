"""Workflow entities (ClickHouse-based, no SQLAlchemy models)."""

from datetime import datetime

from pydantic import BaseModel


class Flow(BaseModel):
    """Workflow flow entity."""

    trace_id: str
    name: str
    description: str | None = None
    labels: dict[str, str]
    status: str | None = None
    status_reason: str | None = None
    duration: int | None = None
    service_name: str | None = None
    created_at: datetime | None = None
    ended_at: datetime | None = None


class Step(BaseModel):
    """Workflow step entity."""

    id: str
    for_flow: str
    trace_id: str
    name: str | None = None
    description: str | None = None
    labels: dict[str, str]
    status: str | None = None
    parent_id: str | None = None
    duration: int | None = None
    status_message: str | None = None
    created_at: datetime | None = None
    started_at: datetime | None = None
    ended_at: datetime | None = None

    children: list["Step"] = []


class WorkflowEvent(BaseModel):
    """Workflow event entity."""

    name: str
    description: str | None = None
    labels: dict[str, str]
    timestamp: datetime
