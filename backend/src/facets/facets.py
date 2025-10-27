from __future__ import annotations

from datetime import UTC, datetime, timedelta
from pathlib import Path
from re import compile, match
from typing import List

from sqlalchemy import cast, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import noload
from sqlalchemy.sql.sqltypes import String
import yaml

from core.context import get_app
from core.stringcase import titlecase

from .entities import Catalog, Label, LabelScrapping, LabelSrcKind, Metric, MetricKind
from .model import (
    Label as LabelModel,
    LabelUsage,
    LabelValue,
    Metric as MetricModel,
    MetricsScrapped,
)

# Technical label mappings for better product/user-friendly display names
TECHNICAL_LABEL_DISPLAY_NAMES = {
    "http_host": "Resource Address",
    "http_method": "Request Type",
    "http_scheme": "Security Protocol",
    "http_server_name": "Server Name",
    "http_status_code": "Response Status",
    "http_target": "URL Path",
}

# Known Prometheus units for metric parsing
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

# Metric name parsing regex
metric_name_parsing = compile(
    r"^(?:dashfrog_internal_(?P<scope>[^_]+)_|dashfrog_user_(?P<custom>[^_]+)_)?"
    r"(?P<name>.+?)"
    r"(?:_(?P<kind>measure|stats|counter))?"
    r"(?:_(?P<unit>(?!total$|sum$|count$|bucket$|buckets$)[^_]+))?"
    r"(?:_(?P<promsuffix>total|sum|count|bucket|buckets))?$"
)


class Facets:
    """
    Comprehensive block combining metrics and labels functionality.

    Provides unified access to both metrics and labels operations including:
    - Metrics listing, querying, and scraping
    - Labels listing, updating, and scraping
    - Label value management
    - Metric time series queries with automatic step calculation
    """

    def __init__(self):
        """Initialize the Facets block."""
        self.__log = get_app().log("facets")
        self.__catalog = self.__load_catalogs()
        # Build catalog lookup for efficient metric validation during scraping
        self.__catalog_by_prom_id = {metric.prom_identifier: metric for metric in self.__catalog.metrics}

    # =============================================================================
    # PRIVATE CATALOG METHODS
    # =============================================================================

    def __load_catalogs(self) -> Catalog:
        """
        Load and merge all catalog files from the catalogs/ directory.

        Returns:
            Merged Catalog containing metrics from all catalog files
        """
        log = self.__log.bind(action="load_catalogs")

        # Determine catalog directory path (relative to project root)
        catalog_dir = Path(__file__).parents[2] / "catalogs"

        if not catalog_dir.exists():
            log.warning("Catalog directory not found", path=str(catalog_dir))
            return Catalog(metrics=[])

        # Collect all metrics from YAML files
        all_metrics = []
        yaml_files = list(catalog_dir.glob("*.yaml")) + list(catalog_dir.glob("*.yml"))

        for yaml_file in yaml_files:
            try:
                log.debug("Loading catalog file", file=yaml_file.name)
                with yaml_file.open() as f:
                    data = yaml.safe_load(f)

                if not data:
                    log.warning("Empty catalog file", file=yaml_file.name)
                    continue

                # Validate and parse with Pydantic
                catalog = Catalog.model_validate(data)
                all_metrics.extend(catalog.metrics)
                log.debug("Loaded catalog", file=yaml_file.name, metric_count=len(catalog.metrics))

            except Exception as e:
                log.error("Failed to load catalog file", file=yaml_file.name, error=str(e))
                # Continue loading other catalogs even if one fails
                continue

        merged_catalog = Catalog(metrics=all_metrics)
        log.info("Catalogs loaded successfully", total_metrics=len(all_metrics))
        return merged_catalog

    # =============================================================================
    # PUBLIC METHODS
    # =============================================================================

    async def list_metrics(self):
        """List all available metrics."""
        log = self.__log.bind(action="list_metrics")

        try:
            async with get_app().sessionmaker.begin() as session:
                metrics = await self.__metrics_list(session, True)

                log.debug("Success!")
                return metrics
        except Exception as e:
            log.error("Failed to list metrics", error=str(e))
            raise

    def query_metrics(self, query: str, from_date: datetime, to_date: datetime, steps: str | None = None):
        """
        Execute a Prometheus query over a time range with automatic step calculation.

        Args:
            ctx: Request context
            query: Prometheus query string
            from_date: Start of time range
            to_date: End of time range
            steps: Optional step size (e.g., "5m", "1h"). If None, calculated automatically.

        Returns:
            List of metric data points with timestamps, values, and labels
        """
        log = self.__log.bind(action="query_metrics", query=query)

        try:
            time_range = int((to_date - from_date).total_seconds())

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

                steps = self.__calculate_nice_step(time_range // precision)

            metrics_data = get_app().prom_client.custom_query_range(query, from_date, to_date, steps)
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
            log.error("Failed to query metrics", query=query, error=str(e))
            raise

    async def scrape_metrics(self):
        """Scrape metrics from Prometheus and update the database."""
        log = self.__log.bind(action="scrape_metrics")

        try:
            async with get_app().sessionmaker.begin() as session:
                scrape_time, scrapped_metrics = await self.__metrics_scrape(session)
                if scrapped_metrics:
                    await self.__metrics_upserts(session, scrapped_metrics)
                    # Only record timestamp after successful upserts
                    await self.__metrics_record_scrape(session, scrape_time)

                log.debug("Success!")
        except Exception as e:
            log.error("Failed to scrape metrics", error=str(e))
            raise

    # =============================================================================
    # PUBLIC LABELS METHODS
    # =============================================================================

    async def list_labels(self, with_hidden: bool = False):
        """List all available labels."""
        log = self.__log.bind(action="list_labels")

        try:
            async with get_app().sessionmaker.begin() as session:
                labels = await self.__labels_list(session, with_hidden)

                log.debug("Success!")
                return labels
        except Exception as e:
            log.error("Failed to list labels", error=str(e))
            raise

    async def update_label(self, label_id: int, description: str | None, hide: bool | None, display_as: str | None):
        """Update label metadata (description, visibility, display name)."""
        log = self.__log.bind(
            action="update_label", label_id=label_id, description=description, hide=hide, display_as=display_as
        )

        try:
            async with get_app().sessionmaker.begin() as session:
                new_values = {}
                if description:
                    new_values["description"] = description
                if hide is not None:
                    new_values["hide"] = hide
                if display_as is not None:
                    new_values["display_as"] = display_as

                updated_label = await self.__labels_update(session, label_id, **new_values)

                log.debug("Success!")
                return updated_label
        except Exception as e:
            log.error("Failed to update label", label_id=label_id, error=str(e))
            raise

    async def update_label_value(self, label_id: int, value_name: str, proxy: str):
        """Update a specific label value with a proxy/mapping."""
        log = self.__log.bind(action="update_label_value", label_id=label_id, value_name=value_name, proxy=proxy)

        try:
            async with get_app().sessionmaker.begin() as session:
                updated_label = await self.__labels_update_value(session, label_id, value_name, mapped_to=proxy)

                log.debug("Success!")
                return updated_label
        except Exception as e:
            log.error("Failed to update label value", label_id=label_id, value_name=value_name, error=str(e))
            raise

    async def scrape_labels(self):
        """Scrape labels from both workflow and metrics sources."""
        log = self.__log.bind(action="scrape_labels")

        try:
            async with get_app().sessionmaker.begin() as session:
                existing_labels = {
                    label.label: {
                        "used_by": [used_in.used_in for used_in in label.used_in],
                        "values": [value.value for value in label.values],
                        "id": label.id,
                    }
                    for label in (await self.__labels_list(session, with_hidden=True))
                }

                existing_metrics = {metric.key: metric.id for metric in (await self.__metrics_list(session))}
                new_labels = {}

                await self.__process_labels(
                    existing_labels,
                    self.__list_workflow_labels(),
                    new_labels,
                    LabelSrcKind.workflow,
                )
                await self.__process_labels(
                    existing_labels,
                    self.__list_metrics_labels(),
                    new_labels,
                    LabelSrcKind.metrics,
                    existing_metrics=existing_metrics,
                )
                await self.__insert_labels(session, new_labels, existing_labels)
                log.debug("Success!")
        except Exception as e:
            log.error("Failed to scrape labels", error=str(e))
            raise

    # =============================================================================
    # PRIVATE METRICS STORE METHODS
    # =============================================================================
    @staticmethod
    async def __metrics_get_last_scrape_time(session: AsyncSession):
        """Get the timestamp of the last successful scrape, or None if never scraped."""
        query = select(MetricsScrapped.ran_at).order_by(MetricsScrapped.ran_at.desc()).limit(1)
        result = await session.execute(query)
        return result.scalar_one_or_none()

    @staticmethod
    async def __metrics_record_scrape(session: AsyncSession, timestamp: datetime):
        """Record a successful scrape at the given timestamp."""
        session.add(MetricsScrapped(ran_at=timestamp))

    @staticmethod
    async def __metrics_list(session: AsyncSession, with_labels: bool = False) -> List[Metric]:
        """List all metrics, optionally with associated labels."""
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

    @staticmethod
    async def __metrics_upserts(session: AsyncSession, metrics: list[Metric]):
        """Insert or update multiple metrics."""
        values = [metric.model_dump(exclude={"id", "labels"}) for metric in metrics]
        insert_stmt = insert(MetricModel).values(values)
        await session.execute(
            insert_stmt.on_conflict_do_update(
                index_elements=["key"],
                set_={col: getattr(insert_stmt.excluded, col) for col in ["kind", "unit", "associated_identifiers"]},
            )
        )

    async def __metrics_scrape(self, session: AsyncSession) -> tuple[datetime, list[Metric]]:
        """
        Scrape metrics from Prometheus using the series API with inline catalog validation.

        Returns:
            Tuple of (scrape_timestamp, list of metric entities)
        """
        # Capture API call timestamp at start
        scrape_start_time = datetime.now(UTC)

        # Get last scrape time or default to 6 months ago for first run
        last_scrape_time = await self.__metrics_get_last_scrape_time(session)
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
        catalog_enriched_count = 0
        metrics_dropped_count = 0

        for metric_name in unique_metric_names:
            if not (matches := parse_prom_name(metric_name)):
                self.__log.error("Invalid metric", name=metric_name)
                continue

            name, kind, scope, unit = matches
            scope = scope or self.__otel_scope_to_scope(metric_name, "") or "UNKNOWN"

            # Initialize defaults
            description = ""
            display_as = titlecase(name)

            # If scope is UNKNOWN, this is a non-dashfrog metric - validate against catalog
            if scope == "UNKNOWN":
                # Check if metric exists in catalog
                catalog_entry = self.__catalog_by_prom_id.get(metric_name)
                if not catalog_entry:
                    # Not in catalog, drop this metric
                    metrics_dropped_count += 1
                    self.__log.debug("Dropping non-dashfrog metric not in catalog", metric_name=metric_name)
                    continue

                # Use catalog data to enrich
                name = catalog_entry.key
                kind = catalog_entry.kind
                unit = catalog_entry.unit or ""
                scope = catalog_entry.scope
                description = catalog_entry.description or ""
                display_as = catalog_entry.display_as or titlecase(name)
                catalog_enriched_count += 1

            # Skip if we already have this key (e.g., foo_sum and foo_count both parse to key "foo")
            # When duplicate detected, keep only the metric with most recent sample
            if name in metrics_by_key:
                existing_identifier = metrics_by_key[name].associated_identifiers[0]

                # Query for last sample time of both metrics
                new_sample_time = self.__get_last_sample_time(metric_name)
                existing_sample_time = self.__get_last_sample_time(existing_identifier)

                if new_sample_time and existing_sample_time:
                    if new_sample_time > existing_sample_time:
                        # New metric is more recent, replace the existing one
                        self.__log.debug(
                            "Replacing older metric variant with newer one",
                            key=name,
                            old_identifier=existing_identifier,
                            new_identifier=metric_name,
                            old_timestamp=existing_sample_time,
                            new_timestamp=new_sample_time,
                        )
                        # Continue to create new entry (will overwrite old one)
                    else:
                        # Existing metric is more recent, keep it
                        self.__log.debug(
                            "Keeping existing metric variant, skipping older one",
                            key=name,
                            kept_identifier=existing_identifier,
                            skipped_identifier=metric_name,
                        )
                        continue
                else:
                    # If we can't determine recency, keep existing
                    self.__log.warning(
                        "Cannot determine metric recency, keeping existing",
                        key=name,
                        existing_identifier=existing_identifier,
                        new_identifier=metric_name,
                    )
                    continue

            # For native histograms, use single identifier (the metric name itself)
            metric_entity = Metric(
                id=-1,
                key=name,
                kind=kind,
                scope=scope,
                unit=unit or "",
                description=description,
                display_as=display_as,
                associated_identifiers=[metric_name],
            )
            metrics_by_key[name] = metric_entity

        self.__log.debug(
            "Metrics scraping complete",
            total_metrics=len(metrics_by_key),
            catalog_enriched=catalog_enriched_count,
            dropped=metrics_dropped_count,
        )

        return scrape_start_time, list(metrics_by_key.values())

    @staticmethod
    def __otel_scope_to_scope(metric_name: str, metric_kind: str) -> str:
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

    def __get_last_sample_time(self, metric_name: str) -> float | None:
        """
        Query Prometheus for the timestamp of the most recent sample for a given metric.

        Args:
            metric_name: The Prometheus metric identifier

        Returns:
            Unix timestamp (float) of the most recent sample, or None if metric not found or query fails
        """
        try:
            # Use instant query to get the latest sample
            # This queries the current value of the metric
            result = get_app().prom_client.custom_query(query=metric_name)

            if result and len(result) > 0:
                # Result format: [{"metric": {...}, "value": [timestamp, value]}]
                # Take the first result (arbitrary choice if multiple series)
                first_result = result[0]
                if "value" in first_result and len(first_result["value"]) >= 2:
                    # timestamp is the first element
                    return float(first_result["value"][0])

            return None
        except Exception as e:
            self.__log.debug("Failed to query last sample time", metric_name=metric_name, error=str(e))
            return None

    @staticmethod
    def __calculate_nice_step(step_seconds: float) -> str:
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
    # PRIVATE LABELS STORE METHODS
    # =============================================================================
    @staticmethod
    async def __labels_list(session: AsyncSession, with_hidden: bool) -> List[Label]:
        """List all labels, optionally including hidden ones."""
        query = select(LabelModel)
        if not with_hidden:
            query = query.where(LabelModel.hide.is_(False))

        labels = await session.execute(query.order_by(LabelModel.label))

        return [label.to_entity() for label in labels.scalars()]

    @staticmethod
    async def __labels_update(session: AsyncSession, label_id: int, **new_values) -> Label:
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

    @staticmethod
    async def __labels_update_value(session: AsyncSession, label_id: int, value_name, **new_values) -> Label.Value:
        """Update a specific label value."""
        label = (await session.execute(select(LabelValue).filter_by(label_id=label_id, value=value_name))).scalar_one()

        for field, value in new_values.items():
            setattr(label, field, value)

        await session.flush()

        return label.to_entity()

    @staticmethod
    def __list_workflow_labels() -> LabelScrapping:
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

    @staticmethod
    def __list_metrics_labels():
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

    async def __process_labels(
        self,
        existing_labels,
        labels,
        new_labels: dict,
        kind: LabelSrcKind,
        existing_metrics: None | dict[str, int] = None,
    ):
        """Process scraped labels and prepare them for insertion."""
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

    @staticmethod
    async def __insert_labels(session: AsyncSession, new_labels: dict, existing_labels: dict):
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


def get_label_display_name(label_key: str) -> str:
    """
    Get a human-friendly display name for a label.

    For technical labels (e.g., http_*, exported_job), returns a predefined
    human-readable name. Otherwise, returns the titlecased version of the label.
    """
    return TECHNICAL_LABEL_DISPLAY_NAMES.get(label_key, titlecase(label_key))


def parse_prom_name(metric_name: str):
    """Parse a Prometheus metric name into its components."""
    if not (matches := metric_name_parsing.match(metric_name)):
        return None

    name = matches.group("name")
    kind: MetricKind = MetricKind(matches.group("kind") or "other")
    df_scope = matches.group("scope")
    usr_scope = matches.group("custom")
    unit = matches.group("unit")

    if (kind == MetricKind.other) and unit not in KNOWN_PROM_UNITS:
        # If no kind and unit is not in Prometheus known units → not a real unit
        name = "_".join(filter(None, [name, unit]))
        unit = None
    elif unit in {
        "total",
        "sum",
        "count",
        "bucket",
        "buckets",
    }:
        # Safety: drop special Prom suffixes if misparsed
        unit = None

    return name, kind, (usr_scope or df_scope), unit
