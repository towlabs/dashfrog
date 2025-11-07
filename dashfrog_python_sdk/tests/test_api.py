"""Tests for DashFrog API."""

import time
from uuid import uuid4

from fastapi.testclient import TestClient
import requests

from dashfrog_python_sdk import get_dashfrog_instance
from dashfrog_python_sdk.api import app
from dashfrog_python_sdk.metric import Counter


def wait_for_metric_in_prometheus(metric_name: str, tenant: str, max_wait: int = 15) -> bool:
    """Poll Prometheus until metric appears or timeout."""
    dashfrog = get_dashfrog_instance()

    start_time = time.time()
    while time.time() - start_time < max_wait:
        try:
            response = requests.get(
                f"{dashfrog.config.prometheus_endpoint}/api/v1/series",
                params={"match[]": f'dashfrog_{metric_name}{{tenant="{tenant}"}}'},
                timeout=5,
            )

            if response.status_code == 200:
                data = response.json()["data"]
                if len(data) > 0:
                    return True  # Metric found!
        except requests.exceptions.RequestException:
            pass  # Ignore connection errors and retry

        time.sleep(0.5)  # Check every 500ms

    return False  # Timeout


class TestMetricAPI:
    """Tests for Metric API endpoints."""

    def test_get_all_labels(self, setup_dashfrog):
        """Test that get_all_labels returns the correct label values from metrics."""

        uuid = str(uuid4()).replace("-", "_")
        counter_name = f"test_api_labels_counter_{uuid}"

        # Create a counter with unique labels for this test
        counter = Counter(
            name=counter_name,
            labels=["api_test_label"],
            pretty_name="API Labels Test Counter",
            unit="count",
            default_aggregation="sum",
        )

        # Record data with a unique label value
        counter.add(1, tenant="api_test_tenant", api_test_label="unique_value_123")
        counter.add(1, tenant="api_test_tenant", api_test_label="unique_value_456")
        counter.add(1, tenant="api_test_tenant_2", api_test_label="unique_value_789")

        # Wait for metrics to appear in Prometheus
        wait_for_metric_in_prometheus(counter_name, "api_test_tenant")

        # Call the API endpoint
        client = TestClient(app)
        response = client.get("/metrics/labels")

        assert response.status_code == 200
        data = response.json()

        assert sorted(data, key=lambda x: x["label"]) == [
            {"label": "api_test_label", "values": ["unique_value_123", "unique_value_456", "unique_value_789"]},
            {"label": "tenant", "values": ["api_test_tenant", "api_test_tenant_2"]},
        ]
