from contextvars import Context
from datetime import datetime

from structlog import BoundLogger

from src.adapters.stores import Events as EventsStore
from src.core import AsyncSessionMaker
from src.domain.entities import Event, EventKind, StoreFilter


class Events:
    def __init__(
        self,
        store: EventsStore,
        session_maker: AsyncSessionMaker,
        logger: BoundLogger,
    ):
        self.__log = logger.bind(name="usecases.Events")
        self.__events = store
        self.__session_maker = session_maker

    async def list(self, _ctx: Context, *filters: StoreFilter) -> list[Event]:
        log = self.__log.bind(action="list")

        async with self.__session_maker.begin():
            events = await self.__events.list(*filters)

        log.debug("Success !")
        return events

    async def create(
        self,
        _ctx: Context,
        title: str,
        kind: str,
        started_at,
        ended_at,
        description: str | None = None,
        labels: dict[str, str] | None = None,
    ) -> Event:
        log = self.__log.bind(action="create", title=title, kind=kind)

        async with self.__session_maker.begin():
            event = Event(
                id=-1,  # Will be set by the database
                title=title,
                description=description,
                kind=kind,  # type: ignore
                labels=labels or {},
                started_at=started_at,
                ended_at=ended_at,
            )
            created_event = await self.__events.create(event)

        log.debug("Success !")
        return created_event

    async def update(
        self,
        _ctx: Context,
        event_id: int,
        title: str | None = None,
        description: str | None = None,
        kind: str | None = None,
        labels: dict[str, str] | None = None,
        started_at: datetime | None = None,
        ended_at: datetime | None = None,
    ) -> Event:
        log = self.__log.bind(action="update", event_id=event_id)

        async with self.__session_maker.begin():
            new_values = {}
            if title is not None:
                new_values["title"] = title
            if description is not None:
                new_values["description"] = description
            if kind is not None:
                new_values["kind"] = EventKind(kind)
            if labels is not None:
                new_values["labels"] = labels
            if started_at is not None:
                new_values["started_at"] = started_at
            if ended_at is not None:
                new_values["ended_at"] = ended_at

            updated_event = await self.__events.update(event_id, **new_values)

        log.debug("Success !")
        return updated_event
