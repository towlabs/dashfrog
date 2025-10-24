from __future__ import annotations

from collections.abc import Iterable
from datetime import datetime

from sqlalchemy import select

from core.context import get_app
from core.stores import StoreFilter

from .entities import Event
from .model import Event as EventModel


class Events:
    def __init__(self):
        self.logger = get_app().log("events")

    async def list(self, *filters: StoreFilter) -> list[Event]:
        log = self.logger.bind(action="list")

        async with get_app().sessionmaker.begin() as session:
            query = select(EventModel).order_by(EventModel.started_at.desc())

            # Apply filters if provided
            if filters:
                query = self.__apply_filters(query, filters)

            events = await session.execute(query)

            log.debug("Success !")
            return [event.to_entity() for event in events.scalars()]

    async def create(
        self,
        title: str,
        description: str | None,
        kind: str,
        labels: dict[str, str],
        started_at: datetime,
        ended_at: datetime,
    ) -> Event:
        log = self.logger.bind(action="create", title=title, kind=kind)

        async with get_app().sessionmaker.begin() as session:
            event_model = EventModel(
                title=title,
                description=description,
                kind=kind,
                labels=labels,
                started_at=started_at,
                ended_at=ended_at,
            )

            session.add(event_model)
            await session.flush()

            log.debug("Success !")
            return event_model.to_entity()

    async def update(
        self,
        event_id: int,
        title: str | None = None,
        description: str | None = None,
        kind: str | None = None,
        labels: dict[str, str] | None = None,
        started_at: datetime | None = None,
        ended_at: datetime | None = None,
    ) -> Event:
        log = self.logger.bind(action="update", event_id=event_id)

        async with get_app().sessionmaker.begin() as session:
            event = (await session.execute(select(EventModel).filter_by(id=event_id))).scalar_one()

            if title is not None:
                event.title = title
            if description is not None:
                event.description = description
            if kind is not None:
                event.kind = kind
            if labels is not None:
                event.labels = labels
            if started_at is not None:
                event.started_at = started_at
            if ended_at is not None:
                event.ended_at = ended_at

            await session.flush()

            log.debug("Success !")
            return event.to_entity()

    # Private methods (former store logic)
    @staticmethod
    def __apply_filters(query, filters: Iterable[StoreFilter]):
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
                    query = query.where(EventModel.labels[label_key].as_string() == filt.value)
                elif filt.op == "like":
                    # Use ->> operator for LIKE operations
                    query = query.where(EventModel.labels[label_key].as_string().like(f"%{filt.value}%"))
                elif filt.op == "!=":
                    query = query.where(EventModel.labels[label_key].as_string() != filt.value)
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
