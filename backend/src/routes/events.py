"""Events API endpoints."""

from collections.abc import Iterable
from datetime import datetime

from fastapi import APIRouter
from pydantic import BaseModel
from sqlalchemy import select

from api.payloads import FilterParams
from core.context import get_app
from core.stores import StoreFilter
from models.event import Event, EventEntity

router = APIRouter(prefix="/events", tags=["events"])


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


def _apply_filters(query, filters: Iterable[StoreFilter]):
    """Apply filters to SQLAlchemy query, handling PostgreSQL JSON for labels."""
    for filt in filters:
        field = filt.field_name or filt.key

        # Check if this is a label filter (key format: labels['key'])
        if field.startswith("labels['") and field.endswith("']"):
            # Extract the label key from labels['key'] format
            label_key = field[8:-2]  # Remove "labels['" and "']"

            # Use PostgreSQL JSON operators
            if filt.op == "=":
                # Use containment operator for exact match
                query = query.where(Event.labels[label_key].as_string() == filt.value)
            elif filt.op == "like":
                # Use ->> operator for LIKE operations
                query = query.where(Event.labels[label_key].as_string().like(f"%{filt.value}%"))
            elif filt.op == "!=":
                query = query.where(Event.labels[label_key].as_string() != filt.value)
            else:
                # For other operators, use ->> to get text value
                json_field = Event.labels[label_key].as_string()
                match filt.op:
                    case ">":
                        query = query.where(json_field > filt.value)
                    case ">=":
                        query = query.where(json_field >= filt.value)
                    case "<":
                        query = query.where(json_field < filt.value)
                    case "<=":
                        query = query.where(json_field <= filt.value)
        else:
            # Regular field filter
            model_field = getattr(Event, field, None)
            if model_field is None:
                continue

            match filt.op:
                case "=":
                    query = query.where(model_field == filt.value)
                case "!=":
                    query = query.where(model_field != filt.value)
                case ">":
                    query = query.where(model_field > filt.value)
                case ">=":
                    query = query.where(model_field >= filt.value)
                case "<":
                    query = query.where(model_field < filt.value)
                case "<=":
                    query = query.where(model_field <= filt.value)
                case "like":
                    query = query.where(model_field.like(f"%{filt.value}%"))
                case "in":
                    query = query.where(model_field.in_(filt.value))

    return query


@router.get("/")
@router.post("/search")
async def list_events(filters: FilterParams = FilterParams()) -> list[EventEntity]:
    """List all events with optional filters."""
    logger = get_app().log("events").bind(action="list")

    async with get_app().sessionmaker.begin() as session:
        query = select(Event).order_by(Event.started_at.desc())

        # Apply filters if provided
        filter_list = filters.get_filters(with_times=True, date_field="started_at")
        if filter_list:
            query = _apply_filters(query, filter_list)

        events = await session.execute(query)

        logger.debug("Success !")
        return [event.to_entity() for event in events.scalars()]


@router.post("/")
async def create_event(body: _EventCreate) -> EventEntity:
    """Create a new event."""
    logger = get_app().log("events").bind(action="create", title=body.title, kind=body.kind)

    async with get_app().sessionmaker.begin() as session:
        event_model = Event(
            title=body.title,
            description=body.description,
            kind=body.kind,
            labels=body.labels,
            started_at=body.started_at,
            ended_at=body.ended_at,
        )

        session.add(event_model)
        await session.flush()

        logger.debug("Success !")
        return event_model.to_entity()


@router.put("/{event_id}")
async def update_event(event_id: int, body: _EventUpdate) -> EventEntity:
    """Update an existing event."""
    logger = get_app().log("events").bind(action="update", event_id=event_id)

    async with get_app().sessionmaker.begin() as session:
        event = (await session.execute(select(Event).filter_by(id=event_id))).scalar_one()

        if body.title is not None:
            event.title = body.title
        if body.description is not None:
            event.description = body.description
        if body.kind is not None:
            event.kind = body.kind
        if body.labels is not None:
            event.labels = body.labels
        if body.started_at is not None:
            event.started_at = body.started_at
        if body.ended_at is not None:
            event.ended_at = body.ended_at

        await session.flush()

        logger.debug("Success !")
        return event.to_entity()
