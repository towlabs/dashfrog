"""Metric API routes."""

from fastapi import APIRouter, HTTPException
import requests
from sqlalchemy import select

from dashfrog_python_sdk import get_dashfrog_instance
from dashfrog_python_sdk.models import Metric as MetricModel

from .schemas import Label

router = APIRouter(prefix="/metrics", tags=["metrics"])


@router.get("/labels", response_model=list[Label])
async def get_all_labels() -> list[Label]:
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
