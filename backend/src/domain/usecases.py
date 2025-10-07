from contextvars import Context
from datetime import datetime

from structlog import BoundLogger

from adapters.stores import Flows as FlowsStore
from src.domain.entities import StoreGreater, StoreLower


class Flows:
    def __init__(self, store: FlowsStore, logger: BoundLogger):
        self.__log = logger.bind(name="usecases.Flows")
        self.__flows = store

    def list_flows(
        self,
        ctx: Context,
        from_date: datetime | None = None,
        to_date: datetime | None = None,
    ):
        log = self.__log.bind(action="list_flows", from_date=from_date, to_date=to_date)
        filters = []
        if from_date:
            filters.append(StoreGreater("Timestamp", from_date))
        if to_date:
            filters.append(StoreLower("Timestamp", to_date))

        flows = self.__flows.list(ctx, *filters)

        log.debug("Success !")

        return flows
