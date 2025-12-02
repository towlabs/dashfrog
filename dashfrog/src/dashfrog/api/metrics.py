"""Metrics API routes."""

from datetime import datetime
from typing import Annotated, Any, Literal

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials
from pydantic import BaseModel
import requests
from sqlalchemy import select
from sqlalchemy.exc import NoResultFound
from sqlalchemy.orm import Session

from dashfrog import get_dashfrog_instance
from dashfrog.models import (
    Metric as MetricModel,
    Notebook,
)

from .auth import security, verify_has_access_to_notebook, verify_token, verify_token_string
from .schemas import (
    BlockFilters,
    DataPoint,
    GroupByFnT,
    InstantMetric,
    InstantMetricRequest,
    Label,
    LabelFilter,
    MetricResponse,
    RangeMetric,
    RangeMetricRequest,
    TimeAggregationT,
    TransformT,
)

router = APIRouter(prefix="/api/metrics", tags=["metrics"])

_STEP = "60s"


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


@router.get("/search", response_model=list[MetricResponse])
async def search_metrics(auth: Annotated[None, Depends(verify_token)]) -> list[MetricResponse]:
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
    metrics: list[MetricResponse] = []

    with Session(dashfrog.db_engine) as session:
        result = session.execute(select(MetricModel)).scalars()

        for metric in result:
            if metric.type == "counter":
                # Rates
                metrics.append(
                    MetricResponse(
                        id=metric.name,
                        prometheusName=metric.name,
                        prettyName=f"{metric.pretty_name} rate",
                        type="rate",
                        unit=metric.unit,
                        labels=metric.labels,
                        groupBy=["sum"],
                        timeAggregation=["last", "avg", "min", "max", "match"],
                    )
                )
                # Increase
                metrics.append(
                    MetricResponse(
                        id=f"{metric.name}-increase",
                        prometheusName=metric.name,
                        prettyName=f"{metric.pretty_name} increase",
                        type="increase",
                        unit=metric.unit,
                        labels=metric.labels,
                        groupBy=["sum"],
                        timeAggregation=["last"],
                    )
                )
                # Ratio
                metrics.append(
                    MetricResponse(
                        id=f"{metric.name}-ratio",
                        prometheusName=metric.name,
                        prettyName=f"{metric.pretty_name} % ratio",
                        type="ratio",
                        unit="percent",
                        labels=metric.labels,
                        groupBy=["sum"],
                        timeAggregation=["last", "avg", "min", "max", "match"],
                    )
                )

            elif metric.type == "histogram":
                metrics.append(
                    MetricResponse(
                        id=metric.name,
                        prometheusName=metric.name,
                        prettyName=f"{metric.pretty_name} percentile",
                        type="histogram",
                        unit=metric.unit,
                        labels=metric.labels,
                        groupBy=["sum"],
                        timeAggregation=["last", "avg", "min", "max", "match"],
                    )
                )

            else:
                metrics.append(
                    MetricResponse(
                        id=metric.name,
                        prometheusName=metric.name,
                        prettyName=metric.pretty_name,
                        type="gauge",
                        unit=metric.unit,
                        labels=metric.labels,
                        groupBy=[
                            "avg",
                            "min",
                            "max",
                            "sum",
                        ],
                        timeAggregation=["last", "avg", "min", "max", "match"],
                    )
                )

        return metrics


def get_range_metric_promql(
    metric: MetricModel,
    transform: TransformT | None,
    transform_metadata: Any,
    labels: list[LabelFilter],
    group_by_labels: list[str],
    group_fn: GroupByFnT,
) -> str:
    metric_name = get_metric_name(metric, labels)

    if metric.type == "counter":
        assert transform is not None
        if transform == "ratio":
            numerator_metric_name = get_metric_name(
                metric, [*labels, *[LabelFilter(**f) for f in transform_metadata.get("filters", {})]]
            )
            numerator = group_by(group_fn, rate(numerator_metric_name, "ratePerSecond"), group_by_labels)
            denominator = group_by(group_fn, rate(metric_name, "ratePerSecond"), group_by_labels)
            return f"({numerator} / {denominator})"
        return group_by(group_fn, rate(metric_name, transform), group_by_labels)
    elif metric.type == "histogram":
        assert transform is not None
        percentile = int(transform.replace("p", "")) / 100
        return (
            f"histogram_quantile({percentile}, {group_by('sum', rate(metric_name, 'ratePerSecond'), group_by_labels)})"
        )
    else:
        return group_by(group_fn, metric_name, group_by_labels)


def get_instant_metric_promql(
    metric: MetricModel,
    transform: TransformT | None,
    transform_metadata: Any,
    time_aggregation: TimeAggregationT,
    group_by_labels: list[str],
    group_fn: GroupByFnT,
    match_operator: Literal["==", "!=", ">=", "<=", ">", "<"] | None,
    match_value: float | None,
    start_time: datetime,
    end_time: datetime,
    labels: list[LabelFilter],
) -> str:
    window_in_seconds = int((end_time - start_time).total_seconds())
    window = f"{window_in_seconds}s"
    metric_name = get_metric_name(metric, labels)

    if metric.type == "counter" and not transform:
        return group_by(group_fn, f"increase({metric_name}[{window}])", group_by_labels)

    vector_promql = get_range_metric_promql(metric, transform, transform_metadata, labels, group_by_labels, group_fn)
    if time_aggregation == "last":
        return vector_promql
    if time_aggregation == "match":
        assert match_operator is not None and match_value is not None
        return f"avg_over_time(({vector_promql} {match_operator} bool {match_value})[{window}:{_STEP}])"

    return f"{time_aggregation}_over_time({vector_promql}[{window}:{_STEP}])"


def get_metric_name(metric: MetricModel, labels: list[LabelFilter]) -> str:
    label_filters = [
        f'{label.label}="{label.value}"' for label in labels if label.label in set(metric.labels) | {"tenant"}
    ]
    return f"dashfrog_{metric.name}" if not labels else f"dashfrog_{metric.name}{{{','.join(label_filters)}}}"


def group_by(fn: GroupByFnT, prom_expr: str, labels: list[str]) -> str:
    return f"{fn}({prom_expr})" if not labels else f"{fn} by ({','.join(labels)})({prom_expr})"


def rate(metric_name: str, transform: TransformT) -> str:
    match transform:
        case "ratePerMinute":
            return f"(rate({metric_name}[{_STEP}]) * 60)"
        case "ratePerHour":
            return f"(rate({metric_name}[{_STEP}]) * 3600)"
        case "ratePerDay":
            return f"(rate({metric_name}[{_STEP}]) * 86400)"
        case _:
            return f"rate({metric_name}[{_STEP}])"


class InstantResponse(BaseModel):
    type: Literal["counter", "histogram", "gauge"]
    unit: str | None
    prettyName: str
    transform: TransformT | None
    scalars: list[InstantMetric]


@router.post("/instant", response_model=InstantResponse)
async def get_instant_metric(
    request: InstantMetricRequest, credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(security)] = None
) -> InstantResponse:
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

        try:
            notebook = session.execute(select(Notebook).where(Notebook.id == request.notebook_id)).scalar_one()
        except NoResultFound:
            raise HTTPException(status_code=404, detail=f"Notebook {request.notebook_id} not found")

        tenant = next((label.value for label in request.labels if label.label == "tenant"))
        verify_has_access_to_notebook(
            credentials,
            notebook,
            tenant,
            request.start_time,
            request.end_time,
            metric_filter=BlockFilters(names=[request.metric_name], filters=request.labels),
        )

        # Generate PromQL query
        promql = get_instant_metric_promql(
            metric,
            request.transform,
            request.transform_metadata,
            request.time_aggregation,
            request.group_by,
            request.group_fn,
            request.match_operator,
            request.match_value,
            request.start_time,
            request.end_time,
            request.labels,
        )

        response = requests.get(
            f"{dashfrog.config.prometheus_endpoint}/api/v1/query",
            params={"query": promql, "time": request.end_time.timestamp()},
            timeout=5,
        )

        if response.status_code != 200:
            raise HTTPException(status_code=502, detail="Prometheus query failed")

        return InstantResponse(
            type=metric.type,
            unit=metric.unit if request.transform != "ratio" else "percent",
            prettyName=metric.pretty_name,
            transform=request.transform,
            scalars=[
                InstantMetric(labels=item["metric"], value=float(item["value"][1]))
                for item in response.json()["data"]["result"]
                if item["value"][1] != "NaN"
            ],
        )


class RangeResponse(BaseModel):
    unit: str | None
    prettyName: str
    transform: TransformT | None
    series: list[RangeMetric]


@router.post("/range", response_model=RangeResponse)
async def get_range_metric(
    request: RangeMetricRequest, credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(security)] = None
) -> RangeResponse:
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
        promql = get_range_metric_promql(
            metric, request.transform, request.transform_metadata, request.labels, request.group_by, request.group_fn
        )

        if request.notebook_id is not None:
            try:
                notebook = session.execute(select(Notebook).where(Notebook.id == request.notebook_id)).scalar_one()
            except NoResultFound:
                raise HTTPException(status_code=404, detail=f"Notebook {request.notebook_id} not found")

            tenant = next((label.value for label in request.labels if label.label == "tenant"))
            verify_has_access_to_notebook(
                credentials,
                notebook,
                tenant,
                request.start_time,
                request.end_time,
                metric_filter=BlockFilters(names=[request.metric_name], filters=request.labels),
            )
        else:
            if credentials is None:
                raise HTTPException(status_code=401, detail="Unauthorized")
            verify_token_string(credentials.credentials)

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
        return RangeResponse(
            unit=metric.unit if request.transform != "ratio" else "percent",
            transform=request.transform,
            prettyName=metric.pretty_name,
            series=[
                RangeMetric(
                    labels={label: item["metric"][label] for label in metric.labels if label in item["metric"]},
                    values=[
                        DataPoint(timestamp=timestamp, value=float(value))
                        for timestamp, value in item["values"]
                        if value != "NaN"
                    ],
                )
                for item in prom_data
            ],
        )


@router.get("/labels", response_model=list[Label])
async def get_all_metric_labels(auth: Annotated[None, Depends(verify_token)]) -> list[Label]:
    """Fetch all labels and their values from Prometheus."""
    dashfrog = get_dashfrog_instance()

    # Step 1: Get registered labels from database
    with dashfrog.db_engine.connect() as conn:
        metrics = conn.execute(select(MetricModel)).fetchall()
        metric_labels = {label for metric in metrics for label in metric.labels} | {"tenant"}
        metric_names = {metric.name for metric in metrics}

    if not metric_names:
        return []

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
