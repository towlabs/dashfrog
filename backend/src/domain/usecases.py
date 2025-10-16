from contextvars import Context
from datetime import datetime

from structlog import BoundLogger

from domain.entities import Step
from src.adapters.stores import (
    Flows as FlowsStore,
    Labels as LabelsStore,
    Steps as StepsStore,
)
from src.core import AsyncSessionMaker
from src.domain.entities import (
    Flow,
    Label,
    LabelSrcKind,
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
        filters: list[StoreFilter] = None,
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

    def get_labels(self, ctx: Context) -> dict[str, list[str]]:
        log = self.__log.bind(action="get_labels")

        labels = self.__flows.get_labels(ctx)

        log.debug("Success !")

        return labels


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


class Labels:
    def __init__(self, store: LabelsStore, session_maker: AsyncSessionMaker, logger: BoundLogger):
        self.__log = logger.bind(name="usecases.Labels")
        self.__labels = store
        self.__session_maker = session_maker

    async def list(self, _ctx: Context):
        log = self.__log.bind(action="list")

        async with self.__session_maker.begin():
            labels = await self.__labels.list()

        log.debug("Success !")
        return labels

    async def update(self, ctx: Context, label_id: int, description: str):
        log = self.__log.bind(action="update", label_id=label_id, description=description)

        async with self.__session_maker.begin():
            updated_label = await self.__labels.update(ctx, label_id, description=description)

        log.debug("Success !")
        return updated_label

    async def update_value(self, ctx: Context, label_id: int, value_name: str, proxy: str):
        log = self.__log.bind(action="update", label_id=label_id, value_name=value_name, proxy=proxy)

        async with self.__session_maker.begin():
            updated_label = await self.__labels.update_value(ctx, label_id, value_name, mapped_to=proxy)

        log.debug("Success !")
        return updated_label

    async def scrape_labels(self, _ctx: Context):
        log = self.__log.bind(action="scrape_labels")

        async with self.__session_maker.begin():
            latest_scrap = await self.__labels.latest_scrap()
            existing_labels = {
                label.label: {
                    "used_by": [used_in.used_in for used_in in label.used_in],
                    "values": [value.value for value in label.values],
                    "id": label.id,
                }
                for label in (await self.__labels.list())
            }

            await self.__process_labels(existing_labels, self.__labels.list_workflow_labels(), LabelSrcKind.workflow)
            await self.__process_labels(
                existing_labels, self.__labels.list_metrics_labels(latest_scrap), LabelSrcKind.metrics
            )

        log.debug("Success !")

    async def __process_labels(self, existing_labels, labels, kind: LabelSrcKind):
        for label_key, label_data in labels.items():
            detected_values = [
                Label.Value(value=value)
                for value in label_data["values"]
                if value not in existing_labels.get(label_key, {}).get("values", [])
            ]
            detected_used_ins = [
                Label.Usage(used_in=used_in, kind=kind)
                for used_in in label_data["used_in"]
                if used_in not in existing_labels.get(label_key, {}).get("used_by", [])
            ]

            if not (label := existing_labels.get(label_key)):
                await self.__labels.insert(
                    Label(
                        id=-1,
                        label=label_key,
                        values=detected_values,
                        used_in=detected_used_ins,
                    )
                )
            else:
                await self.__labels.insert_values(label["id"], detected_values)
                await self.__labels.insert_usage(label["id"], detected_used_ins)
