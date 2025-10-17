from contextvars import Context

from structlog import BoundLogger

from src.adapters.stores import (
    Metrics as MetricsStore,
)
from src.core import AsyncSessionMaker, as_async


class Metrics:
    def __init__(self, store: MetricsStore, session_maker: AsyncSessionMaker, logger: BoundLogger):
        self.__log = logger.bind(name="usecases.Metrics")
        self.__metrics = store
        self.__session_maker = session_maker

    # async def list(self, _ctx: Context):
    #     log = self.__log.bind(action="list")
    #
    #     async with self.__session_maker.begin():
    #         labels = await self.__labels.list()
    #
    #     log.debug("Success !")
    #     return labels

    # async def list_metrics(self):
    #     async with self.__session_maker.begin():
    #         metrics = self.__labels.list_metrics()
    #
    #     return metrics
    #
    # async def update(self, ctx: Context, label_id: int, description: str):
    #     log = self.__log.bind(action="update", label_id=label_id, description=description)
    #
    #     async with self.__session_maker.begin():
    #         updated_label = await self.__labels.update(ctx, label_id, description=description)
    #
    #     log.debug("Success !")
    #     return updated_label

    async def scrape(self, _ctx: Context):
        log = self.__log.bind(action="scrape")

        async with self.__session_maker.begin():
            scrapped_metrics = await as_async(self.__metrics.scrape)

            await self.__metrics.upserts(scrapped_metrics)

        log.debug("Success !")
