from datetime import datetime

from fastapi import APIRouter, Request
from pydantic import BaseModel

from src.core.context import context
from src.domain import usecases
from src.domain.entities import StoreFilter


class _EventCreate(BaseModel):
    title: str
    description: str | None = None
    kind: str
    labels: dict[str, str] = {}
    started_at: datetime
    ended_at: datetime


class _EventUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    kind: str | None = None
    labels: dict[str, str] | None = None
    started_at: datetime | None = None
    ended_at: datetime | None = None


class _FilterParams(BaseModel):
    class Filter(BaseModel):
        key: str
        value: str
        op: str = "="
        is_label: bool = False

    filters: list[Filter] = []
    kind: str = ""
    from_date: datetime | None = None
    to_date: datetime | None = None

    def get_filters(self) -> list[StoreFilter]:
        filters = []

        # Add kind filter if specified
        if self.kind:
            filters.append(StoreFilter(key="kind", value=self.kind, op="="))

        # Add date filters if specified
        if self.from_date:
            filters.append(
                StoreFilter(
                    key="from_started_at",
                    value=self.from_date,
                    op=">=",
                    field_name="started_at",
                )
            )
        if self.to_date:
            filters.append(
                StoreFilter(
                    key="to_started_at",
                    value=self.to_date,
                    op="<=",
                    field_name="started_at",
                )
            )

        # Add custom filters (including label filters)
        for filt in self.filters:
            if filt.is_label:
                # Format for PostgreSQL JSON filtering
                filters.append(StoreFilter(key=f"labels['{filt.key}']", value=filt.value, op=filt.op))
            else:
                filters.append(StoreFilter(key=filt.key, value=filt.value, op=filt.op))

        return filters


class Events:
    __uc: usecases.Events

    ep = APIRouter(prefix="/events", tags=["events"])

    def __init__(self, uc: usecases.Events):
        Events.__uc = uc

    @staticmethod
    @ep.get("/")
    async def list_events(request: Request, filters: _FilterParams = _FilterParams()):
        with context(request) as ctx:
            events = await Events.__uc.list(ctx, *filters.get_filters())

            return events

    @staticmethod
    @ep.post("/search")
    async def search_events(request: Request, filters: _FilterParams):
        with context(request) as ctx:
            events = await Events.__uc.list(ctx, *filters.get_filters())

            return events

    @staticmethod
    @ep.post("/")
    async def create_event(request: Request, body: _EventCreate):
        with context(request) as ctx:
            event = await Events.__uc.create(
                ctx,
                title=body.title,
                kind=body.kind,
                started_at=body.started_at,
                ended_at=body.ended_at,
                description=body.description,
                labels=body.labels,
            )

            return event

    @staticmethod
    @ep.put("/{event_id}")
    async def update_event(request: Request, event_id: int, body: _EventUpdate):
        with context(request) as ctx:
            updated_event = await Events.__uc.update(
                ctx,
                event_id=event_id,
                title=body.title,
                description=body.description,
                kind=body.kind,
                labels=body.labels,
                started_at=body.started_at,
                ended_at=body.ended_at,
            )

            return updated_event
