from datetime import datetime

from fastapi import APIRouter
from pydantic import BaseModel

from api.payloads import FilterParams
from events import Events as EventsCases


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


ep = APIRouter(prefix="/events", tags=["events"])


@ep.get("/")
@ep.post("/search")
async def list_events(filters: FilterParams = FilterParams()):
    return await EventsCases().list(*filters.get_filters(with_times=True, date_field="started_at"))


@ep.post("/")
async def create_event(body: _EventCreate):
    return await EventsCases().create(
        title=body.title,
        description=body.description,
        kind=body.kind,
        labels=body.labels,
        started_at=body.started_at,
        ended_at=body.ended_at,
    )


@ep.put("/{event_id}")
async def update_event(event_id: int, body: _EventUpdate):
    return await EventsCases().update(
        event_id=event_id,
        title=body.title,
        description=body.description,
        kind=body.kind,
        labels=body.labels,
        started_at=body.started_at,
        ended_at=body.ended_at,
    )
