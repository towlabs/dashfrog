from contextvars import Context

from structlog import BoundLogger

from src.adapters.stores import (
    Labels as LabelsStore,
    Metrics as MetricsStore,
)
from src.core import AsyncSessionMaker
from src.core.stringcase import titlecase
from src.domain.entities import (
    Label,
    LabelSrcKind,
)


class Labels:
    def __init__(
        self,
        store: LabelsStore,
        metrics: MetricsStore,
        session_maker: AsyncSessionMaker,
        logger: BoundLogger,
    ):
        self.__log = logger.bind(name="usecases.Labels")
        self.__labels = store
        self.__metrics = metrics
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
            existing_labels = {
                label.label: {
                    "used_by": [used_in.used_in for used_in in label.used_in],
                    "values": [value.value for value in label.values],
                    "id": label.id,
                }
                for label in (await self.__labels.list())
            }

            existing_metrics = {metric.key: metric.id for metric in (await self.__metrics.list())}
            new_labels = {}

            await self.__process_labels(
                existing_labels,
                self.__labels.list_workflow_labels(),
                new_labels,
                LabelSrcKind.workflow,
            )
            await self.__process_labels(
                existing_labels,
                self.__labels.list_metrics_labels(),
                new_labels,
                LabelSrcKind.metrics,
                existing_metrics=existing_metrics,
            )
            await self.__insert_labels(new_labels, existing_labels)
        log.debug("Success !")

    async def __process_labels(
        self,
        existing_labels,
        labels,
        new_labels: dict,
        kind: LabelSrcKind,
        existing_metrics: None | dict[str, int] = None,
    ):
        if kind == LabelSrcKind.metrics and existing_metrics is None:
            self.__log.error("No existing metrics found for processing metrics labels!")
            return

        for label_key, label_data in labels.items():
            detected_values = [
                Label.Value(value=value)
                for value in label_data["values"]
                if value not in existing_labels.get(label_key, {}).get("values", [])
            ]
            if kind == LabelSrcKind.metrics:
                detected_used_ins = [
                    Label.Usage(
                        used_in=existing_metrics[used_in],  # type: ignore[reportOptionalSubscript]
                        kind=kind,
                    )
                    for used_in in label_data["used_in"]
                    if used_in not in existing_labels.get(label_key, {}).get("used_by", [])
                    and used_in in existing_metrics
                ]
            else:
                detected_used_ins = [
                    Label.Usage(used_in=titlecase(used_in), kind=kind)
                    for used_in in label_data["used_in"]
                    if titlecase(used_in) not in existing_labels.get(label_key, {}).get("used_by", [])
                ]

            new_labels[label_key] = {"detected_used_ins": detected_used_ins, "detected_values": detected_values}

    async def __insert_labels(self, new_labels: dict, existing_labels: dict):
        for label_key, data in new_labels.items():
            if not (label := existing_labels.get(label_key)):
                await self.__labels.insert(
                    Label(
                        id=-1,
                        label=label_key,
                        values=data["detected_values"],
                        used_in=data["detected_used_ins"],
                    )
                )
            else:
                await self.__labels.insert_values(label["id"], data["detected_values"])
                await self.__labels.insert_usage(label["id"], data["detected_used_ins"])
