from datetime import UTC, datetime, timedelta

from clickhouse_connect.driver import Client
from prometheus_api_client import PrometheusConnect
from sqlalchemy import desc, select
from sqlalchemy.exc import NoResultFound
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import noload

from context import SESSION
from domain import entities

from .models.labels import (
    Label as LabelModel,
    LabelsScrapped,
    LabelUsage,
    LabelValue,
)

stdList = list


def _get_session() -> AsyncSession:
    if not (session := SESSION.get()):
        raise AttributeError("No session available")

    return session


class Labels:
    def __init__(self, client: Client, prom: PrometheusConnect):
        self.__client = client
        self.__prom = prom

    @staticmethod
    async def list() -> list[entities.Label]:
        labels = await _get_session().execute(select(LabelModel).order_by(LabelModel.label))

        return [label.to_entity() for label in labels.scalars()]

    @staticmethod
    async def update(ctx, label_id: int, **new_values) -> entities.Label:
        db = _get_session()

        label = (
            await db.execute(
                select(LabelModel).options(noload(LabelModel.used_in), noload(LabelModel.values)).filter_by(id=label_id)
            )
        ).scalar_one()

        for field, value in new_values.items():
            setattr(label, field, value)

        await db.flush()

        return label.to_entity()

    @staticmethod
    async def update_value(ctx, label_id: int, value_name, **new_values) -> entities.Label.Value:
        db = _get_session()

        label = (await db.execute(select(LabelValue).filter_by(label_id=label_id, value=value_name))).scalar_one()

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
                used_in=[LabelUsage(used_in=used_in.used_in, kind=used_in.kind) for used_in in label.used_in],
            )
        )

    @staticmethod
    async def insert_values(label_id: int, values: stdList[entities.Label.Value]):
        db = _get_session()
        for value in values:
            db.add(LabelValue(label_id=label_id, value=value.value))

    @staticmethod
    async def insert_usage(label_id: int, used_in: stdList[entities.Label.Usage]):
        db = _get_session()
        for usage in used_in:
            db.add(LabelUsage(label_id=label_id, used_in=usage.used_in, kind=usage.kind))

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

    def list_metrics_labels(self, last_scrapped_at: datetime | None):
        last_scrapped_at = (
            last_scrapped_at or datetime.now(UTC) - timedelta(days=366)
            # should be a safe scope for first run as we should not wait after deploying project.
        )
        labels = self.__prom.get_label_names()

        res = {}
        names = [x for x in labels if not x.startswith("__")]

        for name in names:
            series = self.__prom.all_metrics({"match[]": f'{{{name}=~".+"}}'})
            res[name] = {
                "values": self.__prom.get_label_values(name),
                "used_in": list(set(series)),
            }

        return res

    @staticmethod
    async def latest_scrap() -> datetime | None:
        db = _get_session()

        scraped_at = await db.execute(select(LabelsScrapped).order_by(desc(LabelsScrapped.ran_at)).limit(1))

        try:
            return scraped_at.scalar_one().ran_at
        except NoResultFound:
            return None
