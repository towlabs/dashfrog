from re import compile

from clickhouse_connect.driver import Client
from prometheus_api_client import PrometheusConnect
from sqlalchemy import cast, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import noload
from sqlalchemy.sql.sqltypes import String
from structlog import BoundLogger

from src.core.context import SESSION
from src.core.stringcase import titlecase
from src.domain import entities

from .models.labels import (
    Label as LabelModel,
    LabelUsage,
    LabelValue,
    Metric,
)

KNOWN_PROM_UNITS = {
    "seconds",
    "milliseconds",
    "microseconds",
    "nanoseconds",
    "bytes",
    "kilobytes",
    "megabytes",
    "gigabytes",
    "ratio",
    "percent",
    "count",
    "requests",
}

List = list


metric_name_parsing = compile(
    r"^(?:dashfrog_internal_(?P<scope>[^_]+)_|dashfrog_user_(?P<custom>[^_]+)_)?"
    r"(?P<name>.+?)"
    r"(?:_(?P<kind>measure|stats|counter))?"
    r"(?:_(?P<unit>(?!total$|sum$|count$|bucket$|buckets$)[^_]+))?"
    r"(?:_(?P<promsuffix>total|sum|count|bucket|buckets))?$"
)


def _get_session() -> AsyncSession:
    if not (session := SESSION.get()):
        raise AttributeError("No session available")

    return session


class Labels:
    def __init__(self, client: Client, prom: PrometheusConnect, logger: BoundLogger):
        self.__client = client
        self.__prom = prom
        self.__log = logger.bind(name="stores.Labels")

    @staticmethod
    async def list() -> list[entities.Label]:
        labels = await _get_session().execute(
            select(LabelModel).order_by(LabelModel.label)
        )

        return [label.to_entity() for label in labels.scalars()]

    @staticmethod
    async def update(ctx, label_id: int, **new_values) -> entities.Label:
        db = _get_session()

        label = (
            await db.execute(
                select(LabelModel)
                .options(noload(LabelModel.used_in), noload(LabelModel.values))
                .filter_by(id=label_id)
            )
        ).scalar_one()

        for field, value in new_values.items():
            setattr(label, field, value)

        await db.flush()

        return label.to_entity()

    @staticmethod
    async def update_value(
        ctx, label_id: int, value_name, **new_values
    ) -> entities.Label.Value:
        db = _get_session()

        label = (
            await db.execute(
                select(LabelValue).filter_by(label_id=label_id, value=value_name)
            )
        ).scalar_one()

        for field, value in new_values.items():
            setattr(label, field, value)

        await db.flush()

        return label.to_entity()

    @staticmethod
    async def insert(label: entities.Label):
        db = _get_session()

        db.add(
            LabelModel(
                label=label.label,
                values=[LabelValue(value=value.value) for value in label.values],
                used_in=[
                    LabelUsage(_used_in=str(used_in.used_in), kind=used_in.kind)
                    for used_in in label.used_in
                ],
            )
        )

    @staticmethod
    async def insert_values(label_id: int, values: List[entities.Label.Value]):
        db = _get_session()
        for value in values:
            db.add(LabelValue(label_id=label_id, value=value.value))

    @staticmethod
    async def insert_usage(label_id: int, used_in: List[entities.Label.Usage]):
        db = _get_session()
        for usage in used_in:
            db.add(
                LabelUsage(
                    label_id=label_id, _used_in=str(usage.used_in), kind=usage.kind
                )
            )

    def list_workflow_labels(self) -> entities.LabelScrapping:
        query = """select
            key as key, groupArray(distinct(value)) as values, groupArray(distinct(name)) as used_in
        from dashfrog.flow_events array join mapKeys(labels) as key, mapValues(labels) as value
        group by  key
        order by  key"""

        results = self.__client.query(query)
        res = {}
        for row in results.named_results():
            res[row["key"]] = {"values": row["values"], "used_in": row["used_in"]}

        return res

    def list_metrics_labels(self):
        labels = self.__prom.get_label_names()

        res = {}
        names = [x for x in labels if not x.startswith("__")]

        for name in names:
            series = self.__prom.all_metrics({"match[]": f'{{{name}=~".+"}}'})
            res[name] = {
                "values": self.__prom.get_label_values(name),
                "used_in": list(
                    set(
                        [
                            parse_prom_name(res)[0]
                            for res in set(series)
                            if parse_prom_name(res)
                        ]
                    )
                ),
            }

        return res


class Metrics:
    def __init__(self, client: Client, prom: PrometheusConnect, logger: BoundLogger):
        self.__client = client
        self.__prom = prom
        self.__log = logger.bind(name="stores.Metrics")

    @staticmethod
    async def list(with_labels: bool = False) -> list[entities.Metric]:
        query = select(Metric)
        if with_labels:
            query = (
                select(Metric, LabelModel)
                .outerjoin(LabelUsage, LabelUsage._used_in == cast(Metric.id, String))
                .outerjoin(LabelModel, LabelUsage.label_id == LabelModel.id)
            )
        metrics = await _get_session().execute(query.order_by(Metric.key))

        if with_labels:
            res = {}
            for metric in metrics:
                if metric.Metric.id not in res:
                    res[metric.Metric.id] = metric.Metric.to_entity()

                entity = res[metric.Metric.id]
                entity.labels.append(metric.Label.id)
            return list(res.values())

        return [metric.to_entity() for metric in metrics.scalars()]

    @staticmethod
    async def upserts(metrics: List[entities.Metric]):
        db = _get_session()
        values = [metric.model_dump(exclude={"id"}) for metric in metrics]
        insert_stmt = insert(Metric).values(values)
        await db.execute(
            insert_stmt.on_conflict_do_update(
                index_elements=["key"],
                set_={
                    col: getattr(insert_stmt.excluded, col)
                    for col in ["kind", "unit", "associated_identifiers"]
                },
            )
        )

    def scrape(self) -> List[entities.Metric]:
        data = self.__prom.get_metric_metadata("")
        res = {}
        for metric in data:
            if not (matches := parse_prom_name(metric["metric_name"])):
                self.__log.error("Invalid metric", name=metric["metric_name"])
                continue

            name, kind, scope, unit = matches
            if metric.get("unit"):
                name = name.strip(metric["unit"]).strip("_")
                unit = metric["unit"]

            scope = (
                scope
                or self._otel_scope_to_scope(metric["metric_name"], metric["type"])
                or "UNKNOWN"
            )

            if name not in res:
                metric_entity = entities.Metric(
                    id=-1,
                    key=name,
                    kind=kind,
                    scope=scope,
                    unit=unit or "",
                    description=metric.get("help"),
                    display_as=titlecase(name),
                    associated_identifiers=[str(metric["metric_name"])]
                    if metric["type"] != "histogram"
                    else [
                        f"{metric['metric_name']}_sum",
                        f"{metric['metric_name']}_bucket",
                        f"{metric['metric_name']}_count",
                    ],
                )
                res[name] = metric_entity
            else:
                metric_entity = res[name]
                metric_entity.associated_identifiers.append(str(metric["metric_name"]))

            # no unit found
        return list(res.values())

    def _otel_scope_to_scope(self, metric_name: str, metric_kind: str) -> str:
        def replace(scope: str) -> str:
            if "fastapi" in scope or "flask" in scope or "http" in scope:
                return "api"

            if (
                "celery" in scope
                or "dramatiq" in scope
                or "pubsub" in scope
                or "tasks" in scope
            ):
                return "tasks"

            return "UNKNOW"

        if metric_kind == "histogram":
            metric_name += "_sum"

        candidates = self.__prom.get_label_values(
            "otel_scope_name", {"match[]": metric_name}
        )

        val = [replace(scope) for scope in candidates if replace(scope) != "UNKNOWN"]
        if len(val) == 0:
            return "UNKNOWN"

        return val[0]


def parse_prom_name(metric_name: str):
    if not (matches := metric_name_parsing.match(metric_name)):
        return None

    name = matches.group("name")
    kind = entities.MetricKind(matches.group("kind") or "over")
    df_scope = matches.group("scope")
    usr_scope = matches.group("custom")
    unit = matches.group("unit")

    if (
        kind is None or kind == entities.MetricKind.over
    ) and unit not in KNOWN_PROM_UNITS:
        # If no kind and unit is not in Prometheus known units → not a real unit
        name = "_".join(filter(None, [name, unit]))
        unit = None
    elif kind is not None and unit in {
        "total",
        "sum",
        "count",
        "bucket",
        "buckets",
    }:
        # Safety: drop special Prom suffixes if misparsed
        unit = None

    return name, kind, (usr_scope or df_scope), unit
