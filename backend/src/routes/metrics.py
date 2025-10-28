from __future__ import annotations

from datetime import UTC, datetime, timedelta
from re import compile
from typing import List

from fastapi import APIRouter
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from core.context import get_app
from core.stringcase import titlecase
from models.facets import (
    Label as LabelModel,
    LabelUsage,
    Metric as MetricModel,
    MetricEntity,
    MetricKind,
    MetricsScrapped,
)
from models.helpers import KNOWN_PROM_UNITS, parse_prom_name

# Alias for consistency with old code
Metric = MetricEntity

# Time range precision mapping for metrics queries
TIME_RANGE_PRECISION = dict(
    [
        (-1, 180),
        (3600, 240),  # range more than 1h
        (6 * 3600, 180),  #  range more than 6h
        (24 * 3600, 144),  # range more than 1d
        (7 * 24 * 3600, 168),  #  range more than 7d
        (30 * 24 * 3600, 180),  #  range more than a month
        (367 * 24 * 3600, 130),  #  range more than a year
    ]
)


class _Query(BaseModel):
    query: str
    from_date: datetime
    to_date: datetime
    steps: str | None = None


router = APIRouter(prefix="/metrics", tags=["metrics"])


# =============================================================================
# PRIVATE HELPER FUNCTIONS
# =============================================================================


async def _metrics_get_last_scrape_time(session: AsyncSession):
    """Get the timestamp of the last successful scrape, or None if never scraped."""
    query = select(MetricsScrapped.ran_at).order_by(MetricsScrapped.ran_at.desc()).limit(1)
    result = await session.execute(query)
    return result.scalar_one_or_none()


async def _metrics_record_scrape(session: AsyncSession, timestamp: datetime):
    """Record a successful scrape at the given timestamp."""
    session.add(MetricsScrapped(ran_at=timestamp))


async def _metrics_list(session: AsyncSession, with_labels: bool = False) -> List[Metric]:
    """List all metrics, optionally with associated labels."""
    from sqlalchemy import cast
    from sqlalchemy.sql.sqltypes import String

    query = select(MetricModel)
    if with_labels:
        query = (
            select(MetricModel, LabelModel)
            .outerjoin(LabelUsage, LabelUsage._used_in == cast(MetricModel.id, String))
            .outerjoin(LabelModel, LabelUsage.label_id == LabelModel.id)
        )
    metrics = await session.execute(query.order_by(MetricModel.key))

    if with_labels:
        res = {}
        for metric in metrics:
            if metric.Metric.id not in res:
                res[metric.Metric.id] = metric.Metric.to_entity()

            entity = res[metric.Metric.id]
            if metric.Label is not None:
                entity.labels.append(metric.Label.id)
        return list(res.values())

    return [metric.to_entity() for metric in metrics.scalars()]


async def _metrics_upserts(session: AsyncSession, metrics: List[Metric]):
    """Insert or update multiple metrics."""
    values = [metric.model_dump(exclude={"id", "labels"}) for metric in metrics]
    insert_stmt = insert(MetricModel).values(values)
    await session.execute(
        insert_stmt.on_conflict_do_update(
            index_elements=["key"],
            set_={col: getattr(insert_stmt.excluded, col) for col in ["kind", "unit", "associated_identifiers"]},
        )
    )


async def _metrics_scrape(session: AsyncSession, log) -> tuple[datetime, List[Metric]]:
    """
    Scrape metrics from Prometheus using the series API.

    Returns:
        Tuple of (scrape_timestamp, list of metric entities)
    """
    # Capture API call timestamp at start
    scrape_start_time = datetime.now(UTC)

    # Get last scrape time or default to 6 months ago for first run
    last_scrape_time = await _metrics_get_last_scrape_time(session)
    if last_scrape_time is None:
        last_scrape_time = scrape_start_time - timedelta(days=180)  # 6 months

    # Query all series in the time range
    series_list = get_app().prom_client.get_series(
        last_scrape_time, scrape_start_time, params={"match[]": ['{__name__=~".+"}']}
    )

    # Extract unique metric names from all series (deduplicate by __name__)
    unique_metric_names = {series.get("__name__") for series in series_list if series.get("__name__")}

    # Build metric entities from unique names, deduplicating by key
    # (multiple prometheus names can map to the same key, e.g. foo_sum, foo_bucket -> "foo")
    metrics_by_key = {}
    for metric_name in unique_metric_names:
        if not (matches := parse_prom_name(metric_name)):
            log.error("Invalid metric", name=metric_name)
            continue

        name, kind, scope, unit = matches
        scope = scope or _otel_scope_to_scope(metric_name, "") or "UNKNOWN"

        # Skip if we already have this key (e.g., foo_sum and foo_count both parse to key "foo")
        if name in metrics_by_key:
            # Add this metric_name to associated_identifiers if not already there
            if metric_name not in metrics_by_key[name].associated_identifiers:
                metrics_by_key[name].associated_identifiers.append(metric_name)
            continue

        # Determine if histogram based on metric name suffixes
        is_histogram = any(metric_name.endswith(suffix) for suffix in ["_sum", "_bucket", "_count"])
        base_name = metric_name
        for suffix in ["_sum", "_bucket", "_count"]:
            if base_name.endswith(suffix):
                base_name = base_name[: -len(suffix)]
                break

        metric_entity = Metric(
            id=-1,
            key=name,
            kind=kind,
            scope=scope,
            unit=unit or "",
            description="",  # Series API doesn't provide description
            display_as=titlecase(name),
            associated_identifiers=[str(base_name)]
            if not is_histogram
            else [
                f"{base_name}_sum",
                f"{base_name}_bucket",
                f"{base_name}_count",
            ],
        )
        metrics_by_key[name] = metric_entity

    return scrape_start_time, list(metrics_by_key.values())


def _otel_scope_to_scope(metric_name: str, metric_kind: str) -> str:
    """Convert OpenTelemetry scope to application scope."""

    def replace(scope: str) -> str:
        if "fastapi" in scope or "flask" in scope or "http" in scope:
            return "api"

        if "celery" in scope or "dramatiq" in scope or "pubsub" in scope or "tasks" in scope:
            return "tasks"

        return "UNKNOW"

    if metric_kind == "histogram":
        metric_name += "_sum"

    candidates = get_app().prom_client.get_label_values("otel_scope_name", {"match[]": metric_name})

    val = [replace(scope) for scope in candidates if replace(scope) != "UNKNOWN"]
    if len(val) == 0:
        return "UNKNOWN"

    return val[0]


def _calculate_nice_step(step_seconds: float) -> str:
    """
    Convert step in seconds to a nice human-readable format with appropriate time units.

    Rules:
    - < 60s: multiples of 5 seconds (5s, 10s, 15s, ...)
    - 60s - 3600s: multiples of 5 minutes (5m, 10m, 15m, ...)
    - 3600s - 86400s: multiples of 1 hour (1h, 2h, 3h, ...)
    - 86400s - ~60 days: 1 day or multiples of 7 days (1d, 7d, 14d, ...)
    - ~60 days - 365 days: multiples of 1 month (1mo, 2mo, 3mo, ...)
    - >= 365 days: years (1y, 2y, 5y, then multiples of 5: 10y, 15y, 20y, ...)
    """

    if step_seconds <= 0:
        return "5s"  # Default to 5 seconds for invalid inputs

    # Define time constants
    MINUTE = 60
    HOUR = 3600
    DAY = 86400
    MONTH = 30 * DAY  # Approximate month (30 days)
    YEAR = 365 * DAY  # Approximate year (365 days)

    # Determine the best unit based on the magnitude
    if step_seconds >= YEAR:  # >= 1 year
        years = step_seconds / YEAR
        if years < 3:
            return f"{years}y"
        elif years < 5:
            return "5y"
        else:
            # Round to nearest multiple of 5
            nice_years = int(max(5, round(years / 5) * 5))
            return f"{nice_years}y"
    elif step_seconds >= 2 * MONTH:  # >= ~60 days (2 months)
        months = step_seconds / MONTH
        nice_months = int(max(1, round(months)))
        return f"{nice_months}mo"
    elif step_seconds >= DAY:  # >= 1 day
        days = step_seconds / DAY
        if days < 7:
            return "1d"
        else:
            # Round to nearest multiple of 7
            nice_days = int(max(7, round(days / 7) * 7))
            return f"{nice_days}d"
    elif step_seconds >= HOUR:  # >= 1 hour
        hours = step_seconds / HOUR
        nice_hours = int(max(1, round(hours)))
        return f"{nice_hours}h"
    elif step_seconds >= MINUTE:  # >= 1 minute
        minutes = step_seconds / MINUTE
        nice_minutes = int(max(1, round(minutes / 5) * 5))
        return f"{nice_minutes}m"
    else:  # < 1 minute
        nice_seconds = int(max(5, round(step_seconds / 5) * 5))
        return f"{nice_seconds}s"


# =============================================================================
# ROUTE HANDLERS
# =============================================================================


@router.get("/")
async def list_metrics():
    """List all available metrics."""
    log = get_app().log("facets").bind(action="list_metrics")

    try:
        async with get_app().sessionmaker.begin() as session:
            metrics = await _metrics_list(session, True)

            log.debug("Success!")
            return metrics
    except Exception as e:
        log.error("Failed to list metrics", error=str(e))
        raise


@router.post("/query")
def query_metrics(body: _Query):
    """
    Execute a Prometheus query over a time range with automatic step calculation.

    Args:
        body: Query parameters including query string, from_date, to_date, and optional steps

    Returns:
        List of metric data points with timestamps, values, and labels
    """
    log = get_app().log("facets").bind(action="query_metrics", query=body.query)

    try:
        time_range = int((body.to_date - body.from_date).total_seconds())

        steps = body.steps
        if not steps:
            last_born = None
            precision = 180
            for born, next_precision in TIME_RANGE_PRECISION.items():
                if not last_born:
                    last_born = born
                    precision = next_precision
                    continue

                if last_born < time_range <= born:
                    break

                last_born = born
                precision = next_precision

            steps = _calculate_nice_step(time_range // precision)

        metrics_data = get_app().prom_client.custom_query_range(body.query, body.from_date, body.to_date, steps)
        res = []
        for data in metrics_data:
            labels = data["metric"]
            if "__name__" in labels:
                del labels["__name__"]

            for val in data["values"]:
                res.append({"ts": val[0], "value": val[1], "labels": labels})

        res.sort(key=lambda x: x["ts"])
        log.debug("Success!")
        return res
    except Exception as e:
        log.error("Failed to query metrics", query=body.query, error=str(e))
        raise


@router.get("/scrape")
async def scrape_metrics():
    """Scrape metrics from Prometheus and update the database."""
    log = get_app().log("facets").bind(action="scrape_metrics")

    try:
        async with get_app().sessionmaker.begin() as session:
            scrape_time, scrapped_metrics = await _metrics_scrape(session, log)
            if scrapped_metrics:
                await _metrics_upserts(session, scrapped_metrics)
                # Only record timestamp after successful upserts
                await _metrics_record_scrape(session, scrape_time)

            log.debug("Success!")
    except Exception as e:
        log.error("Failed to scrape metrics", error=str(e))
        raise
