"""Metrics API routes."""

from datetime import datetime
from typing import Callable

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
import requests
from sqlalchemy import select
from sqlalchemy.exc import NoResultFound
from sqlalchemy.orm import Session

from dashfrog_python_sdk import get_dashfrog_instance
from dashfrog_python_sdk.models import Metric as MetricModel

from .schemas import (
    DataPoint,
    InstantMetric,
    Label,
    MetricRequest,
    MetricResponse,
    RangeMetric,
)

router = APIRouter(prefix="/metrics", tags=["metrics"])

_STEP = "300s"


def get_range_resolution(start_time: datetime, end_time: datetime) -> str:
    """Determine the best resolution/step for a Prometheus range query.

    Best practices:
    - Aim for ~250-300 data points for optimal visualization
    - Use round numbers (1m, 5m, 15m, 1h, etc.) for better caching
    - Don't go below scrape interval (typically 15s-1m)
    - Cap at reasonable maximums based on time range

    Args:
        start_time: Start of the time range
        end_time: End of the time range

    Returns:
        Step duration as a string (e.g., "15s", "1m", "5m", "1h")
    """
    duration_seconds = (end_time - start_time).total_seconds()

    # Target ~250 data points for optimal performance and visualization
    target_points = 250

    # Calculate ideal step
    ideal_step = duration_seconds / target_points

    # Round to standard intervals for better Prometheus caching
    if ideal_step < 15:
        return "15s"  # Minimum (typical scrape interval)
    elif ideal_step < 30:
        return "30s"
    elif ideal_step < 60:
        return "1m"
    elif ideal_step < 120:
        return "2m"
    elif ideal_step < 300:
        return "5m"
    elif ideal_step < 600:
        return "10m"
    elif ideal_step < 900:
        return "15m"
    elif ideal_step < 1800:
        return "30m"
    elif ideal_step < 3600:
        return "1h"
    elif ideal_step < 7200:
        return "2h"
    elif ideal_step < 21600:
        return "6h"
    elif ideal_step < 43200:
        return "12h"
    elif ideal_step < 86400:
        return "1d"
    else:
        return "1d"  # Maximum step for very long ranges


class MetricSearchRequest(BaseModel):
    """Request body for searching/listing metrics."""

    labels: list[str] = Field(default_factory=list, description="Filter metrics by label names")


@router.post("/search", response_model=list[MetricResponse])
async def search_metrics(request: MetricSearchRequest) -> list[MetricResponse]:
    """Search/list metrics with optional label filters.

    Args:
        request: Search request containing optional label filters

    Example request body:
        {
            "labels": ["tenant", "region"]
        }

    Returns only metrics that have ALL the specified labels.
    If labels is empty, returns all metrics.
    """
    dashfrog = get_dashfrog_instance()

    with dashfrog.db_engine.connect() as conn:
        query = select(MetricModel)

        # Add filter conditions for each required label
        for label in request.labels:
            # Use PostgreSQL array contains operator (@>) to check if label exists
            query = query.where(MetricModel.labels.contains([label]))

        result = conn.execute(query).fetchall()

        return [
            MetricResponse(
                name=metric.name,
                prettyName=metric.pretty_name,
                type=metric.type,
                unit=metric.unit,
                defaultAggregation=metric.aggregation,
                labels=metric.labels,
            )
            for metric in result
        ]


def get_range_metric_promql(metric: MetricModel, request: MetricRequest) -> tuple[str, str]:
    label_filters = [f'{label.key}="{label.value}"' for label in request.labels if label.key in metric.labels]
    metric_name = (
        f"dashfrog_{metric.name}" if not request.labels else f"dashfrog_{metric.name}{{{','.join(label_filters)}}}"
    )
    if metric.type == "counter":
        if metric.aggregation.startswith("rate"):
            return metric_name, spatial_agg(metric, f"rate({metric_name}[{_STEP}])")
        else:
            return metric_name, spatial_agg(metric, f"increase({metric_name}[{_STEP}])")
    else:
        percentile = int(metric.aggregation.replace("p", "")) / 100
        rate_metric = f"rate({metric_name}[{_STEP}])"
        return metric_name, f"histogram_quantile({percentile}, {spatial_agg(metric, rate_metric)})"


def get_instant_metric_promql(metric: MetricModel, request: MetricRequest) -> str:
    window_in_seconds = int((request.end_time - request.start_time).total_seconds())
    window = f"{window_in_seconds}s"
    metric_name, vector_promql = get_range_metric_promql(metric, request)

    if metric.type == "counter":
        if metric.aggregation.startswith("rate"):
            return temporal_agg(metric, _STEP, window)(vector_promql)
        else:
            return spatial_agg(metric, f"increase({metric_name}[{window}])")
    else:
        return temporal_agg(metric, _STEP, window)(vector_promql)


def spatial_agg(metric: MetricModel, prom_expr: str) -> str:
    return f"sum({prom_expr})" if not metric.labels else f"sum by ({','.join(metric.labels)})({prom_expr})"


def temporal_agg(metric: MetricModel, step: str, window: str) -> Callable[[str], str]:
    match metric.aggregation:
        case "ratePerSecond":
            return lambda prom_expr: f"avg_over_time({prom_expr}[{window}:{step}])"
        case "ratePerMinute":
            return lambda prom_expr: f"avg_over_time({prom_expr}[{window}:{step}]) * 60"
        case "ratePerHour":
            return lambda prom_expr: f"avg_over_time({prom_expr}[{window}:{step}]) * 3600"
        case "ratePerDay":
            return lambda prom_expr: f"avg_over_time({prom_expr}[{window}:{step}]) * 86400"
        case _:
            return lambda prom_expr: f"avg_over_time({prom_expr}[{window}:{step}])"


@router.post("/instant", response_model=list[InstantMetric])
async def get_instant_metric(request: MetricRequest) -> list[InstantMetric]:
    """Query Prometheus for instant metric value over a time range.

    This endpoint generates an instant query that aggregates data over the time window
    using temporal aggregation (avg_over_time with subqueries).

    Args:
        request: Request containing metric name, time range, and label filters

    Example request body:
        {
            "metric_name": "orders",
            "start_time": "2024-01-01T00:00:00Z",
            "end_time": "2024-01-01T01:00:00Z",
            "labels": [
                {"key": "tenant", "value": "acme-corp"}
            ]
        }

    Returns:
        list[InstantMetric]
    """
    dashfrog = get_dashfrog_instance()

    # Fetch metric from database
    with Session(dashfrog.db_engine) as session:
        try:
            metric = session.execute(select(MetricModel).where(MetricModel.name == request.metric_name)).scalar_one()
        except NoResultFound:
            raise HTTPException(status_code=404, detail=f"Metric {request.metric_name} not found")

        # Generate PromQL query
        promql = get_instant_metric_promql(metric, request)

        response = requests.get(
            f"{dashfrog.config.prometheus_endpoint}/api/v1/query",
            params={"query": promql, "time": request.end_time.timestamp()},
            timeout=5,
        )

        if response.status_code != 200:
            raise HTTPException(status_code=502, detail="Prometheus query failed")

        prom_data = response.json()["data"]["result"]

        return [
            InstantMetric(
                metric_name=request.metric_name,
                labels={label: item["metric"][label] for label in metric.labels},
                value=float(item["value"][1]),
            )
            for item in prom_data
            if item["value"][1] != "NaN"
        ]


@router.post("/range", response_model=list[RangeMetric])
async def get_range_metric(request: MetricRequest) -> list[RangeMetric]:
    """Query Prometheus for range metric value.

    This endpoint generates a range query that returns the value over a time range.

    Args:
        request: Request containing metric name and label filters

    Example request body:
        {
            "metric_name": "orders",
            "labels": [
                {"key": "tenant", "value": "acme-corp"}
            ]
        }

    Returns:
        list[RangeMetric]
    """
    dashfrog = get_dashfrog_instance()

    # Fetch metric from database
    with Session(dashfrog.db_engine) as session:
        try:
            metric = session.execute(select(MetricModel).where(MetricModel.name == request.metric_name)).scalar_one()
        except NoResultFound:
            raise HTTPException(status_code=404, detail=f"Metric {request.metric_name} not found")

        # Generate PromQL query
        _metric_name, promql = get_range_metric_promql(metric, request)

        response = requests.get(
            f"{dashfrog.config.prometheus_endpoint}/api/v1/query_range",
            params={
                "query": promql,
                "start": request.start_time.timestamp(),
                "end": request.end_time.timestamp(),
                "step": get_range_resolution(request.start_time, request.end_time),
            },
            timeout=10,
        )

        if response.status_code != 200:
            raise HTTPException(status_code=502, detail="Prometheus query failed")

        prom_data = response.json()["data"]["result"]
        return [
            RangeMetric(
                metric_name=request.metric_name,
                labels={label: item["metric"][label] for label in metric.labels},
                values=[
                    DataPoint(timestamp=timestamp, value=float(value))
                    for timestamp, value in item["values"]
                    if value != "NaN"
                ],
            )
            for item in prom_data
        ]


@router.get("/labels", response_model=list[Label])
async def get_all_metric_labels() -> list[Label]:
    """Fetch all labels and their values from Prometheus."""
    dashfrog = get_dashfrog_instance()

    # Step 1: Get registered labels from database
    with dashfrog.db_engine.connect() as conn:
        metrics = conn.execute(select(MetricModel)).fetchall()
        metric_labels = {label for metric in metrics for label in metric.labels} | {"tenant"}
        metric_names = {metric.name for metric in metrics}

    # Step 2: Fetch all series from Prometheus
    try:
        # Use POST with explicit metric names to avoid URL length limits
        matchers = [("match[]", f"dashfrog_{name}") for name in sorted(metric_names)]

        response = requests.post(
            f"{dashfrog.config.prometheus_endpoint}/api/v1/series",
            data=matchers,
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            timeout=10,
        )

        if response.status_code != 200:
            raise HTTPException(status_code=502, detail="Prometheus query failed")

        series_data = response.json()["data"]
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=502, detail=f"Failed to connect to Prometheus: {e}")

    # Step 3: Extract label values for registered labels only
    label_values = {label: set() for label in metric_labels}
    for series in series_data:
        for label in metric_labels:
            if label in series:
                label_values[label].add(series[label])

    # Convert to sorted lists
    return [Label(label=label, values=sorted(values)) for label, values in label_values.items()]
