from __future__ import annotations

from re import match
from typing import List

from fastapi import APIRouter
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import noload

from core.context import get_app
from core.stringcase import titlecase
from models.facets import (
    Label as LabelModel,
    LabelEntity,
    LabelScrapping,
    LabelSrcKind,
    LabelUsage,
    LabelValue,
)
from models.helpers import TECHNICAL_LABEL_DISPLAY_NAMES, get_label_display_name, parse_prom_name

# Alias for consistency with old code
Label = LabelEntity


class _LabelUpdate(BaseModel):
    description: str | None = None
    hide: bool | None = None
    display_as: str | None = None


class _LabelValueUpdate(BaseModel):
    proxy: str


router = APIRouter(prefix="/labels", tags=["flows", "labels", "metrics"])


# =============================================================================
# PRIVATE HELPER FUNCTIONS
# =============================================================================


async def _labels_list(session: AsyncSession, with_hidden: bool) -> List[Label]:
    """List all labels, optionally including hidden ones."""
    query = select(LabelModel)
    if not with_hidden:
        query = query.where(LabelModel.hide.is_(False))

    labels = await session.execute(query.order_by(LabelModel.label))

    return [label.to_entity() for label in labels.scalars()]


async def _labels_update(session: AsyncSession, label_id: int, **new_values) -> Label:
    """Update a label with new values."""
    label = (
        await session.execute(
            select(LabelModel).options(noload(LabelModel.used_in), noload(LabelModel.values)).filter_by(id=label_id)
        )
    ).scalar_one()

    for field, value in new_values.items():
        setattr(label, field, value)

    await session.flush()

    return label.to_entity()


async def _labels_update_value(
    session: AsyncSession, label_id: int, value_name, **new_values
) -> Label.Value:
    """Update a specific label value."""
    label = (await session.execute(select(LabelValue).filter_by(label_id=label_id, value=value_name))).scalar_one()

    for field, value in new_values.items():
        setattr(label, field, value)

    await session.flush()

    return label.to_entity()


def _list_workflow_labels() -> LabelScrapping:
    """List labels from workflow events stored in ClickHouse."""
    query = """select
        key as key, groupArray(distinct(value)) as values, groupArray(distinct(name)) as used_in
    from dashfrog.flow_events array join mapKeys(labels) as key, mapValues(labels) as value
    group by  key
    order by  key"""

    results = get_app().clickhouse_client.query(query)
    res = {}
    for row in results.named_results():
        res[row["key"]] = {"values": row["values"], "used_in": row["used_in"]}

    return res


def _list_metrics_labels():
    """List labels from Prometheus metrics."""
    labels = get_app().prom_client.get_label_names()

    res = {}
    names = [x for x in labels if not x.startswith("__")]

    for name in names:
        series = get_app().prom_client.all_metrics({"match[]": f'{{{name}=~".+"}}'})
        res[name] = {
            "values": get_app().prom_client.get_label_values(name),
            "used_in": list({parsed[0] for res in set(series) if (parsed := parse_prom_name(res))}),
        }

    return res


async def _process_labels(
    existing_labels,
    labels,
    new_labels: dict,
    kind: LabelSrcKind,
    log,
    existing_metrics: None | dict[str, int] = None,
):
    """Process scraped labels and prepare them for insertion."""
    if kind == LabelSrcKind.metrics and existing_metrics is None:
        log.error("No existing metrics found for processing metrics labels!")
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


async def _insert_labels(session: AsyncSession, new_labels: dict, existing_labels: dict):
    """Insert new labels and update existing ones with new values/usage."""
    blacklisted = get_app().configuration.default_blacklist_labels
    for label_key, data in new_labels.items():
        if not (label := existing_labels.get(label_key)):
            session.add(
                LabelModel(
                    label=label_key,
                    display_as=get_label_display_name(label_key),
                    hide=any(match(rf"^{blacked}$", label_key) for blacked in blacklisted),
                    values=[LabelValue(value=value.value) for value in data["detected_values"]],
                    used_in=[
                        LabelUsage(_used_in=str(used_in.used_in), kind=used_in.kind)
                        for used_in in data["detected_used_ins"]
                    ],
                )
            )
        else:
            # Insert new values
            for value in data["detected_values"]:
                session.add(LabelValue(label_id=label["id"], value=value.value))
            # Insert new usage records
            for usage in data["detected_used_ins"]:
                session.add(LabelUsage(label_id=label["id"], _used_in=str(usage.used_in), kind=usage.kind))


async def _metrics_list(session: AsyncSession):
    """List all metrics for label scraping."""
    from models.facets import Metric as MetricSQLModel

    metrics = await session.execute(select(MetricSQLModel).order_by(MetricSQLModel.key))
    return [metric.to_entity() for metric in metrics.scalars()]


# =============================================================================
# ROUTE HANDLERS
# =============================================================================


@router.get("/")
async def get_labels(with_hidden: bool = False):
    """List all available labels."""
    log = get_app().log("facets").bind(action="list_labels")

    try:
        async with get_app().sessionmaker.begin() as session:
            labels = await _labels_list(session, with_hidden)

            log.debug("Success!")
            return labels
    except Exception as e:
        log.error("Failed to list labels", error=str(e))
        raise


@router.put("/{label_id}")
async def update_label(label_id: int, body: _LabelUpdate):
    """Update label metadata (description, visibility, display name)."""
    log = get_app().log("facets").bind(
        action="update_label", label_id=label_id, description=body.description, hide=body.hide, display_as=body.display_as
    )

    try:
        async with get_app().sessionmaker.begin() as session:
            new_values = {}
            if body.description:
                new_values["description"] = body.description
            if body.hide is not None:
                new_values["hide"] = body.hide
            if body.display_as is not None:
                new_values["display_as"] = body.display_as

            updated_label = await _labels_update(session, label_id, **new_values)

            log.debug("Success!")
            return updated_label
    except Exception as e:
        log.error("Failed to update label", label_id=label_id, error=str(e))
        raise


@router.put("/{label_id}/value/{value_name}")
async def update_label_value(label_id: int, value_name: str, body: _LabelValueUpdate):
    """Update a specific label value with a proxy/mapping."""
    log = get_app().log("facets").bind(action="update_label_value", label_id=label_id, value_name=value_name, proxy=body.proxy)

    try:
        async with get_app().sessionmaker.begin() as session:
            updated_label = await _labels_update_value(session, label_id, value_name, mapped_to=body.proxy)

            log.debug("Success!")
            return updated_label
    except Exception as e:
        log.error("Failed to update label value", label_id=label_id, value_name=value_name, error=str(e))
        raise


@router.get("/scrape")
async def scrape_labels():
    """Scrape labels from both workflow and metrics sources."""
    log = get_app().log("facets").bind(action="scrape_labels")

    try:
        async with get_app().sessionmaker.begin() as session:
            existing_labels = {
                label.label: {
                    "used_by": [used_in.used_in for used_in in label.used_in],
                    "values": [value.value for value in label.values],
                    "id": label.id,
                }
                for label in (await _labels_list(session, with_hidden=True))
            }

            existing_metrics = {metric.key: metric.id for metric in (await _metrics_list(session))}
            new_labels = {}

            await _process_labels(
                existing_labels,
                _list_workflow_labels(),
                new_labels,
                LabelSrcKind.workflow,
                log,
            )
            await _process_labels(
                existing_labels,
                _list_metrics_labels(),
                new_labels,
                LabelSrcKind.metrics,
                log,
                existing_metrics=existing_metrics,
            )
            await _insert_labels(session, new_labels, existing_labels)
            log.debug("Success!")
    except Exception as e:
        log.error("Failed to scrape labels", error=str(e))
        raise
