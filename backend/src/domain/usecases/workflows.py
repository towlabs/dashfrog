from contextvars import Context
from datetime import datetime

from structlog import BoundLogger

from domain.entities import Step
from src.adapters.stores import (
    Flows as FlowsStore,
    Steps as StepsStore,
)
from src.domain.entities import (
    Flow,
    StoreEqual,
    StoreFilter,
    StoreGreater,
    StoreLower,
    StoreOrder,
)


class Flows:
    def __init__(self, store: FlowsStore, logger: BoundLogger):
        self.__log = logger.bind(name="usecases.Flows")
        self.__flows = store

    def list_flows(
        self,
        ctx: Context,
        from_date: datetime | None = None,
        to_date: datetime | None = None,
        order_by: StoreOrder = None,  # type: ignore[reportArgumentType]
        filters: list[StoreFilter] = None,  # type: ignore[reportArgumentType]
    ) -> list[Flow]:
        filters = filters or []
        order_by = order_by or StoreOrder()
        log = self.__log.bind(action="list_flows", from_date=from_date, to_date=to_date)

        if from_date:
            filters.append(StoreGreater("created_at", from_date))

        if to_date:
            filters.append(StoreLower("created_at", to_date))

        flows, _ = self.__flows.list(ctx, *filters, order_by=order_by)

        log.debug("Success !")

        return flows

    def get_latest_flow_runs(
        self,
        ctx: Context,
        from_date: datetime | None = None,
        to_date: datetime | None = None,
        filters: list[StoreFilter] = None,  # type: ignore[reportArgumentType]
    ) -> list[Flow]:
        log = self.__log.bind(action="get_latest_flow_runs", from_date=from_date, to_date=to_date)
        filters = filters or []

        if from_date:
            filters.append(StoreGreater("created_at", from_date))

        if to_date:
            filters.append(StoreLower("created_at", to_date))

        flows = self.__flows.get_latest_flows(ctx, *filters)

        log.debug("Success !")

        return flows

    def get_single_history(
        self,
        ctx: Context,
        flow_name: str,
        limit: int,
        offset: int,
        filters: list[StoreFilter] = None,  # type: ignore[reportArgumentType]
        orders: StoreOrder = None,  # type: ignore[reportArgumentType]
    ) -> tuple[list[Flow], int]:
        log = self.__log.bind(action="get_single_history", flow_name=flow_name)

        filters = filters or []
        filters.append(StoreEqual("name", flow_name))

        flows, nb_res = self.__flows.list(ctx, *filters, limit=limit, offset=offset, order_by=(orders or StoreOrder()))

        log.debug("Success !")

        return flows, nb_res

    def get(self, ctx: Context, flow_name: str, trace_id: str) -> Flow:
        log = self.__log.bind(action="get_single_history", flow_name=flow_name, trace_id=trace_id)

        flow = self.__flows.one(ctx, flow_name, trace_id)

        log.debug("Success !")

        return flow


class Steps:
    def __init__(self, store: StepsStore, logger: BoundLogger):
        self.__log = logger.bind(name="usecases.Steps")
        self.__steps = store

    def get(
        self,
        ctx: Context,
        flow_name: str,
        trace_id: str,
    ) -> list[Step]:
        log = self.__log.bind(action="get", flow_name=flow_name, trace_id=trace_id)

        steps = self.__steps.get_for_flow(ctx, flow_name, trace_id)

        log.debug("Success !")

        return steps
