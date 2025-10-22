from collections.abc import Iterable

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.context import SESSION
from src.domain import entities

from .models.events import Event as EventModel


def _get_session() -> AsyncSession:
    if not (session := SESSION.get()):
        raise AttributeError("No session available")

    return session


def _apply_filters(query, filters: Iterable[entities.StoreFilter]):
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
                query = query.where(
                    EventModel.labels[label_key].as_string() == filt.value
                )
            elif filt.op == "like":
                # Use ->> operator for LIKE operations
                query = query.where(
                    EventModel.labels[label_key].as_string().like(f"%{filt.value}%")
                )
            elif filt.op == "!=":
                query = query.where(
                    EventModel.labels[label_key].as_string() != filt.value
                )
            else:
                # For other operators, use ->> to get text value
                json_field = EventModel.labels[label_key].as_string()
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
            model_field = getattr(EventModel, field, None)
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


class Events:
    @staticmethod
    async def list(*filters: entities.StoreFilter) -> list[entities.Event]:
        query = select(EventModel).order_by(EventModel.started_at.desc())

        # Apply filters if provided
        if filters:
            query = _apply_filters(query, filters)

        events = await _get_session().execute(query)

        return [event.to_entity() for event in events.scalars()]

    @staticmethod
    async def create(event: entities.Event) -> entities.Event:
        db = _get_session()

        event_model = EventModel(
            title=event.title,
            description=event.description,
            kind=event.kind.value,
            labels=event.labels,
            started_at=event.started_at,
            ended_at=event.ended_at,
        )

        db.add(event_model)
        await db.flush()

        return event_model.to_entity()

    @staticmethod
    async def update(event_id: int, **new_values) -> entities.Event:
        db = _get_session()

        event = (await db.execute(select(EventModel).filter_by(id=event_id))).scalar_one()

        for field, value in new_values.items():
            # Handle kind field specially to convert enum to string
            if field == "kind" and hasattr(value, "value"):
                setattr(event, field, value.value)
            else:
                setattr(event, field, value)

        await db.flush()

        return event.to_entity()