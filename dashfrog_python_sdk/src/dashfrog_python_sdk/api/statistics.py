"""Metric API routes."""

from datetime import datetime
from typing import Callable

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
import requests
from sqlalchemy import select
from sqlalchemy.exc import NoResultFound
from sqlalchemy.orm import Session

from dashfrog_python_sdk import get_dashfrog_instance
from dashfrog_python_sdk.models import Statistic

from .schemas import (
    DataPoint,
    InstantStatistic,
    Label,
    RangeStatistic,
    StatisticRequest,
    StatisticResponse,
)

router = APIRouter(prefix="/statistics", tags=["statistics"])

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


class StatisticSearchRequest(BaseModel):
    """Request body for searching/listing statistics."""

    labels: list[str] = Field(default_factory=list, description="Filter statistics by label names")


@router.post("/search", response_model=list[StatisticResponse])
async def search_statistics(request: StatisticSearchRequest) -> list[StatisticResponse]:
    """Search/list statistics with optional label filters.

    Args:
        request: Search request containing optional label filters

    Example request body:
        {
            "labels": ["tenant", "region"]
        }

    Returns only statistics that have ALL the specified labels.
    If labels is empty, returns all statistics.
    """
    dashfrog = get_dashfrog_instance()

    with dashfrog.db_engine.connect() as conn:
        query = select(Statistic)

        # Add filter conditions for each required label
        for label in request.labels:
            # Use PostgreSQL array contains operator (@>) to check if label exists
            query = query.where(Statistic.labels.contains([label]))

        result = conn.execute(query).fetchall()

        return [
            StatisticResponse(
                name=statistic.name,
                prettyName=statistic.pretty_name,
                type=statistic.type,
                unit=statistic.unit,
                defaultAggregation=statistic.default_aggregation,
                labels=statistic.labels,
            )
            for statistic in result
        ]


def get_range_promql(statistic: Statistic, request: StatisticRequest) -> tuple[str, str]:
    label_filters = [f'{label.key}="{label.value}"' for label in request.labels if label.key in statistic.labels]
    statistic_name = (
        f"dashfrog_{statistic.name}"
        if not request.labels
        else f"dashfrog_{statistic.name}{{{','.join(label_filters)}}}"
    )
    if statistic.type == "counter":
        if statistic.default_aggregation.startswith("rate"):
            return statistic_name, spatial_agg(statistic, f"rate({statistic_name}[{_STEP}])")
        else:
            return statistic_name, spatial_agg(statistic, f"increase({statistic_name}[{_STEP}])")
    else:
        percentile = int(statistic.default_aggregation.replace("p", "")) / 100
        rate_statistic = f"rate({statistic_name}[{_STEP}])"
        return statistic_name, f"histogram_quantile({percentile}, {spatial_agg(statistic, rate_statistic)})"


def get_instant_promql(statistic: Statistic, request: StatisticRequest) -> str:
    window_in_seconds = int((request.end_time - request.start_time).total_seconds())
    window = f"{window_in_seconds}s"
    statistic_name, vector_promql = get_range_promql(statistic, request)

    if statistic.type == "counter":
        if statistic.default_aggregation.startswith("rate"):
            return temporal_agg(statistic, _STEP, window)(vector_promql)
        else:
            # Use increase() which handles counter semantics properly
            # Note: With remote write at 1s intervals, we get frequent data points
            # but increase() still extrapolates to window boundaries, leading to non-integer values
            return spatial_agg(statistic, f"increase({statistic_name}[{window}])")
    else:
        return temporal_agg(statistic, _STEP, window)(vector_promql)


def spatial_agg(statistic: Statistic, prom_expr: str) -> str:
    return f"sum({prom_expr})" if not statistic.labels else f"sum by ({','.join(statistic.labels)})({prom_expr})"


def temporal_agg(statistic: Statistic, step: str, window: str) -> Callable[[str], str]:
    match statistic.default_aggregation:
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


@router.post("/instant", response_model=list[InstantStatistic])
async def get_instant_statistic(request: StatisticRequest) -> list[InstantStatistic]:
    """Query Prometheus for instant statistic value over a time range.

    This endpoint generates an instant query that aggregates data over the time window
    using temporal aggregation (avg_over_time with subqueries).

    Args:
        request: Request containing statistic name, time range, and label filters

    Example request body:
        {
            "statistic_name": "orders",
            "start_time": "2024-01-01T00:00:00Z",
            "end_time": "2024-01-01T01:00:00Z",
            "labels": [
                {"key": "tenant", "value": "acme-corp"}
            ]
        }

    Returns:
        list[InstantStatistic]
    """
    dashfrog = get_dashfrog_instance()

    # Fetch metric from database
    with Session(dashfrog.db_engine) as session:
        try:
            statistic = session.execute(select(Statistic).where(Statistic.name == request.statistic_name)).scalar_one()
        except NoResultFound:
            raise HTTPException(status_code=404, detail=f"Statistic {request.statistic_name} not found")

        # Generate PromQL query
        promql = get_instant_promql(statistic, request)

        response = requests.get(
            f"{dashfrog.config.prometheus_endpoint}/api/v1/query",
            params={"query": promql, "time": request.end_time.timestamp()},
            timeout=5,
        )

        if response.status_code != 200:
            raise HTTPException(status_code=502, detail="Prometheus query failed")

        prom_data = response.json()["data"]["result"]

        return [
            InstantStatistic(
                statistic_name=request.statistic_name,
                labels={label: item["metric"][label] for label in statistic.labels},
                value=float(item["value"][1]),
            )
            for item in prom_data
            if item["value"][1] != "NaN"
        ]


@router.post("/range", response_model=list[RangeStatistic])
async def get_range_statistic(request: StatisticRequest) -> list[RangeStatistic]:
    """Query Prometheus for range statistic value.

    This endpoint generates a range query that returns the value over a time range.

    Args:
        request: Request containing statistic name and label filters

    Example request body:
        {
            "statistic_name": "orders",
            "labels": [
                {"key": "tenant", "value": "acme-corp"}
            ]
        }

    Returns:
        list[RangeStatistic]
    """
    dashfrog = get_dashfrog_instance()

    # Fetch metric from database
    with Session(dashfrog.db_engine) as session:
        try:
            statistic = session.execute(select(Statistic).where(Statistic.name == request.statistic_name)).scalar_one()
        except NoResultFound:
            raise HTTPException(status_code=404, detail=f"Statistic {request.statistic_name} not found")

        # Generate PromQL query
        _statistic_name, promql = get_range_promql(statistic, request)

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
            RangeStatistic(
                statistic_name=request.statistic_name,
                labels={label: item["metric"][label] for label in statistic.labels},
                values=[
                    DataPoint(timestamp=timestamp, value=float(value))
                    for timestamp, value in item["values"]
                    if value != "NaN"
                ],
            )
            for item in prom_data
        ]


@router.get("/labels", response_model=list[Label])
async def get_all_statistic_labels() -> list[Label]:
    """Fetch all labels and their values from Prometheus."""
    dashfrog = get_dashfrog_instance()

    # Step 1: Get registered labels from database
    with dashfrog.db_engine.connect() as conn:
        statistics = conn.execute(select(Statistic)).fetchall()
        statistic_labels = {label for statistic in statistics for label in statistic.labels} | {"tenant"}
        statistic_names = {statistic.name for statistic in statistics}

    # Step 2: Fetch all series from Prometheus
    try:
        # Use POST with explicit metric names to avoid URL length limits
        matchers = [("match[]", f"dashfrog_{name}") for name in sorted(statistic_names)]

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
    label_values = {label: set() for label in statistic_labels}
    for series in series_data:
        for label in statistic_labels:
            if label in series:
                label_values[label].add(series[label])

    # Convert to sorted lists
    return [Label(label=label, values=sorted(values)) for label, values in label_values.items()]
