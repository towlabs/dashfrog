"""Tests for DashFrog metrics."""

import time

from sqlalchemy import select

from dashfrog_python_sdk import get_dashfrog_instance
from dashfrog_python_sdk.metric import Counter, Histogram
from dashfrog_python_sdk.models import Metric as MetricModel

from tests.utils import wait_for_metric_in_prometheus


class TestCounter:
    """Tests for Counter metric."""

    def test_counter_increment(self, setup_dashfrog):
        """Test that a counter can be incremented."""
        # Create a counter
        counter = Counter(
            name="test_counter",
            labels=["environment", "status"],
            pretty_name="Test Counter",
            unit="count",
            default_aggregation="sum",
        )

        # Increment the counter
        counter.add(1, tenant="test_tenant1", environment="production", status="success")
        counter.add(5, tenant="test_tenant2", environment="staging", status="failure")
        counter.add(10, tenant="test_tenant3", environment="production", status="success")

        # Verify the metric was registered in the database
        dashfrog = get_dashfrog_instance()
        with dashfrog.db_engine.connect() as conn:
            result = conn.execute(select(MetricModel).where(MetricModel.name == "test_counter")).fetchone()

            assert result is not None
            assert result.name == "test_counter"
            assert result.type == "counter"
            assert result.pretty_name == "Test Counter"
            assert result.unit == "count"
            assert result.default_aggregation == "sum"
            assert set(result.labels) == {"environment", "status"}

    def test_counter_data_in_prometheus(self, setup_dashfrog):
        service_instance_id = get_dashfrog_instance().resource.attributes["service.instance.id"]
        # Create a counter with a unique name
        counter = Counter(
            name="test_counter",
            labels=["status"],
            pretty_name="Prometheus Test Counter",
            unit="requests",
            default_aggregation="sum",
        )

        # Increment the counter
        counter.add(
            1,
            tenant="tenant1",
            status="success",
        )
        counter.add(
            2,
            tenant="tenant2",
            status="success",
        )
        counter.add(
            3,
            tenant="tenant3",
            status="failure",
        )

        # Wait for metrics to be exported (export interval is 1000ms + some buffer)
        time.sleep(10)

        # Query Prometheus to verify the metric exists
        # Note: The metric name has the 'dashfrog' namespace prefix from OTEL collector config
        query = f'dashfrog_test_counter{{instance="{service_instance_id}"}}'

        data = wait_for_metric_in_prometheus(query)

        for idx, tenant in enumerate(["tenant1", "tenant2", "tenant3"]):
            tenant_data = next(r for r in data if r["metric"].get("tenant") == tenant)
            assert tenant_data is not None
            assert float(tenant_data["value"][1]) == idx + 1


class TestHistogram:
    """Tests for Histogram metric."""

    def test_histogram_record(self, setup_dashfrog):
        """Test that a histogram can record values."""
        # Create a histogram
        histogram = Histogram(
            name="test_histogram",
            labels=["endpoint", "method"],
            pretty_name="Test Histogram",
            unit="milliseconds",
            default_aggregation="p95",
        )

        # Record some values
        histogram.record(100, tenant="test_tenant1", endpoint="/api/users", method="GET")
        histogram.record(250, tenant="test_tenant2", endpoint="/api/posts", method="POST")
        histogram.record(50, tenant="test_tenant3", endpoint="/api/users", method="GET")

        # Verify the metric was registered in the database
        dashfrog = get_dashfrog_instance()
        with dashfrog.db_engine.connect() as conn:
            result = conn.execute(select(MetricModel).where(MetricModel.name == "test_histogram")).fetchone()

            assert result is not None
            assert result.name == "test_histogram"
            assert result.type == "histogram"
            assert result.pretty_name == "Test Histogram"
            assert result.unit == "milliseconds"
            assert result.default_aggregation == "p95"
            assert set(result.labels) == {"endpoint", "method"}

    def test_histogram_data_in_prometheus(self, setup_dashfrog):
        service_instance_id = get_dashfrog_instance().resource.attributes["service.instance.id"]
        # Create a histogram with a unique name
        histogram = Histogram(
            name="test_histogram",
            labels=["endpoint"],
            pretty_name="Prometheus Test Histogram",
            unit="milliseconds",
            default_aggregation="p99",
        )

        # Record values to create a distribution
        histogram.record(
            100,
            tenant="tenant1",
            endpoint="/api/v1",
        )
        histogram.record(
            200,
            tenant="tenant2",
            endpoint="/api/v1",
        )
        histogram.record(
            300,
            tenant="tenant3",
            endpoint="/api/v2",
        )

        # Query Prometheus to verify the native histogram exists
        # Native histograms don't use _bucket, _sum, _count suffixes (add_metric_suffixes: false)
        query = f'dashfrog_test_histogram{{instance="{service_instance_id}"}}'
        data = wait_for_metric_in_prometheus(query)

        # Verify each tenant has recorded data in the native histogram
        # Native histograms store the full distribution, we just verify they exist
        for idx, tenant in enumerate(["tenant1", "tenant2", "tenant3"]):
            tenant_data = next(r for r in data if r["metric"].get("tenant") == tenant)
            assert tenant_data is not None
            # Native histogram value contains the histogram data structure
            assert tenant_data["histogram"][1]["count"] == "1"
            assert tenant_data["histogram"][1]["sum"] == f"{idx + 1}00"
