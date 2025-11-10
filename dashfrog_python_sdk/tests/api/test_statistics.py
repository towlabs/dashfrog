"""Tests for Statistics API endpoints."""

from datetime import datetime, timedelta, timezone
import time
from uuid import uuid4

from fastapi.testclient import TestClient

from dashfrog_python_sdk.api import app
from dashfrog_python_sdk.api.schemas import LabelFilter, StatisticRequest
from dashfrog_python_sdk.api.statistics import get_instant_promql, get_range_promql, get_range_resolution
from dashfrog_python_sdk.models import Statistic
from dashfrog_python_sdk.statistics import Counter, Histogram

from tests.utils import wait_for_metric_in_prometheus


class TestStatisticsAPI:
    """Tests for Statistics API endpoints."""

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
        wait_for_metric_in_prometheus(f"dashfrog_{counter_name}")

        # Call the API endpoint
        client = TestClient(app)
        response = client.get("/statistics/labels")

        assert response.status_code == 200
        data = response.json()

        assert sorted(data, key=lambda x: x["label"]) == [
            {"label": "api_test_label", "values": ["unique_value_123", "unique_value_456", "unique_value_789"]},
            {"label": "tenant", "values": ["api_test_tenant", "api_test_tenant_2"]},
        ]

    def test_search_statistics(self, setup_dashfrog):
        """Test that search_metrics returns metrics filtered by labels."""

        uuid = str(uuid4()).replace("-", "_")

        # Create metrics with different label combinations
        counter1 = Counter(
            name=f"test_search_counter_1_{uuid}",
            labels=["tenant", "region"],
            pretty_name="Counter 1",
            unit="count",
            default_aggregation="sum",
        )

        counter2 = Counter(
            name=f"test_search_counter_2_{uuid}",
            labels=["tenant", "environment"],
            pretty_name="Counter 2",
            unit="requests",
            default_aggregation="ratePerSecond",
        )

        counter3 = Counter(
            name=f"test_search_counter_3_{uuid}",
            labels=["tenant", "region", "environment"],
            pretty_name="Counter 3",
            unit="errors",
            default_aggregation="sum",
        )

        # Test 1: No filter - should return all metrics
        client = TestClient(app)
        response = client.post("/statistics/search", json={"labels": []})
        assert response.status_code == 200
        data = response.json()
        metric_names = {m["name"] for m in data}
        assert counter1.name in metric_names
        assert counter2.name in metric_names
        assert counter3.name in metric_names

        # Test 2: Filter by single label - should return metrics that have "region"
        response = client.post("/statistics/search", json={"labels": ["region"]})
        assert response.status_code == 200
        data = response.json()
        filtered_names = [m["name"] for m in data if uuid in m["name"]]
        assert counter1.name in filtered_names
        assert counter2.name not in filtered_names
        assert counter3.name in filtered_names

        # Test 3: Filter by multiple labels - should return only metrics with ALL labels
        response = client.post("/statistics/search", json={"labels": ["tenant", "region", "environment"]})
        assert response.status_code == 200
        data = response.json()
        filtered_names = [m["name"] for m in data if uuid in m["name"]]
        assert counter1.name not in filtered_names  # Only has tenant, region
        assert counter2.name not in filtered_names  # Only has tenant, environment
        assert counter3.name in filtered_names  # Has all three

        # Test 4: Verify response structure
        response = client.post("/statistics/search", json={"labels": []})
        data = response.json()
        test_metrics = [m for m in data if uuid in m["name"]]
        assert len(test_metrics) >= 3

        for metric in test_metrics:
            assert "name" in metric
            assert "prettyName" in metric
            assert "type" in metric
            assert "unit" in metric
            assert "defaultAggregation" in metric
            assert "labels" in metric
            assert isinstance(metric["labels"], list)

    def test_get_instant_promql(self, setup_dashfrog):
        """Test that get_instant_promql generates correct PromQL queries."""

        now = datetime.now(timezone.utc)
        start_time = now - timedelta(hours=1)
        end_time = now

        # Test 1: Counter with sum aggregation, no labels
        counter_sum = Statistic(
            name="test_counter",
            pretty_name="Test Counter",
            type="counter",
            unit="count",
            default_aggregation="sum",
            labels=[],
        )
        request_no_labels = StatisticRequest(
            statistic_name="test_counter",
            start_time=start_time,
            end_time=end_time,
            labels=[],
        )
        query = get_instant_promql(counter_sum, request_no_labels)
        assert query == "sum(increase(dashfrog_test_counter[3600s]))"

        # Test 2: Counter with ratePerSecond aggregation, no labels
        counter_rate = Statistic(
            name="test_counter",
            pretty_name="Test Counter",
            type="counter",
            unit="count",
            default_aggregation="ratePerSecond",
            labels=["tenant"],
        )
        query = get_instant_promql(counter_rate, request_no_labels)
        assert query == "avg_over_time(sum by (tenant)(rate(dashfrog_test_counter[300s]))[3600s:300s])"

        # Test 3: Counter with ratePerMinute aggregation, with labels
        counter_rate_minute = Statistic(
            name="test_counter",
            pretty_name="Test Counter",
            type="counter",
            unit="count",
            default_aggregation="ratePerMinute",
            labels=["tenant", "region"],
        )
        request_with_labels = StatisticRequest(
            statistic_name="test_counter",
            start_time=start_time,
            end_time=end_time,
            labels=[
                LabelFilter(key="tenant", value="acme"),
                LabelFilter(key="region", value="us-east-1"),
            ],
        )
        query = get_instant_promql(counter_rate_minute, request_with_labels)
        assert (
            query
            == 'avg_over_time(sum by (tenant,region)(rate(dashfrog_test_counter{tenant="acme",region="us-east-1"}[300s]))[3600s:300s]) * 60'
        )

        # Test 4: Histogram with p50 aggregation
        histogram_p50 = Statistic(
            name="test_histogram",
            pretty_name="Test Histogram",
            type="histogram",
            unit="ms",
            default_aggregation="p50",
            labels=["tenant"],
        )
        request_histogram = StatisticRequest(
            statistic_name="test_histogram",
            start_time=start_time,
            end_time=end_time,
            labels=[LabelFilter(key="tenant", value="test")],
        )
        query = get_instant_promql(histogram_p50, request_histogram)
        assert (
            query
            == 'avg_over_time(histogram_quantile(0.5, sum by (tenant)(rate(dashfrog_test_histogram{tenant="test"}[300s])))[3600s:300s])'
        )

        # Test 5: Histogram with p99 aggregation
        histogram_p99 = Statistic(
            name="test_histogram",
            pretty_name="Test Histogram",
            type="histogram",
            unit="ms",
            default_aggregation="p99",
            labels=["tenant"],
        )
        query = get_instant_promql(histogram_p99, request_histogram)
        assert (
            query
            == 'avg_over_time(histogram_quantile(0.99, sum by (tenant)(rate(dashfrog_test_histogram{tenant="test"}[300s])))[3600s:300s])'
        )

        # Test 6: Counter with ratePerHour aggregation
        counter_rate_hour = Statistic(
            name="test_counter",
            pretty_name="Test Counter",
            type="counter",
            unit="count",
            default_aggregation="ratePerHour",
            labels=[],
        )
        query = get_instant_promql(counter_rate_hour, request_no_labels)
        assert query == "avg_over_time(sum(rate(dashfrog_test_counter[300s]))[3600s:300s]) * 3600"

        # Test 7: Counter with ratePerDay aggregation
        counter_rate_day = Statistic(
            name="test_counter",
            pretty_name="Test Counter",
            type="counter",
            unit="count",
            default_aggregation="ratePerDay",
            labels=[],
        )
        query = get_instant_promql(counter_rate_day, request_no_labels)
        assert query == "avg_over_time(sum(rate(dashfrog_test_counter[300s]))[3600s:300s]) * 86400"

        # Test 8: Different time ranges affect window and step
        request_short = StatisticRequest(
            statistic_name="test_counter",
            start_time=now - timedelta(minutes=2),
            end_time=now,
            labels=[],
        )
        query = get_instant_promql(counter_sum, request_short)
        # Window is 120s, step is min(120, 300) = 120s
        assert query == "sum(increase(dashfrog_test_counter[120s]))"

        request_long = StatisticRequest(
            statistic_name="test_counter",
            start_time=now - timedelta(hours=24),
            end_time=now,
            labels=[],
        )
        query = get_instant_promql(counter_rate, request_long)
        # Window is 86400s, step is min(86400, 300) = 300s
        assert query == "avg_over_time(sum by (tenant)(rate(dashfrog_test_counter[300s]))[86400s:300s])"

    def test_get_range_promql(self, setup_dashfrog):
        """Test that get_range_promql generates correct range queries."""

        now = datetime.now(timezone.utc)
        start_time = now - timedelta(hours=1)
        end_time = now

        # Test 1: Counter with sum aggregation, no labels
        counter_sum = Statistic(
            name="test_counter",
            pretty_name="Test Counter",
            type="counter",
            unit="count",
            default_aggregation="sum",
            labels=[],
        )
        request_no_labels = StatisticRequest(
            statistic_name="test_counter",
            start_time=start_time,
            end_time=end_time,
            labels=[],
        )
        metric_name, vector_query = get_range_promql(counter_sum, request_no_labels)
        assert metric_name == "dashfrog_test_counter"
        assert vector_query == "sum(increase(dashfrog_test_counter[300s]))"

        # Test 2: Counter with ratePerSecond aggregation, no labels
        counter_rate = Statistic(
            name="test_counter",
            pretty_name="Test Counter",
            type="counter",
            unit="count",
            default_aggregation="ratePerSecond",
            labels=[],
        )
        metric_name, vector_query = get_range_promql(counter_rate, request_no_labels)
        assert metric_name == "dashfrog_test_counter"
        assert vector_query == "sum(rate(dashfrog_test_counter[300s]))"

        # Test 3: Counter with ratePerMinute aggregation, with labels
        counter_rate_minute = Statistic(
            name="test_counter",
            pretty_name="Test Counter",
            type="counter",
            unit="count",
            default_aggregation="ratePerMinute",
            labels=["tenant", "region"],
        )
        request_with_labels = StatisticRequest(
            statistic_name="test_counter",
            start_time=start_time,
            end_time=end_time,
            labels=[
                LabelFilter(key="tenant", value="acme"),
                LabelFilter(key="region", value="us-east-1"),
            ],
        )
        metric_name, vector_query = get_range_promql(counter_rate_minute, request_with_labels)
        assert metric_name == 'dashfrog_test_counter{tenant="acme",region="us-east-1"}'
        assert (
            vector_query
            == 'sum by (tenant,region)(rate(dashfrog_test_counter{tenant="acme",region="us-east-1"}[300s]))'
        )

        # Test 4: Histogram with p50 aggregation, with labels
        histogram_p50 = Statistic(
            name="test_histogram",
            pretty_name="Test Histogram",
            type="histogram",
            unit="ms",
            default_aggregation="p50",
            labels=["tenant"],
        )
        request_histogram = StatisticRequest(
            statistic_name="test_histogram",
            start_time=start_time,
            end_time=end_time,
            labels=[LabelFilter(key="tenant", value="test")],
        )
        metric_name, vector_query = get_range_promql(histogram_p50, request_histogram)
        assert metric_name == 'dashfrog_test_histogram{tenant="test"}'
        assert (
            vector_query
            == 'histogram_quantile(0.5, sum by (tenant)(rate(dashfrog_test_histogram{tenant="test"}[300s])))'
        )

        # Test 5: Histogram with p99 aggregation
        histogram_p99 = Statistic(
            name="test_histogram",
            pretty_name="Test Histogram",
            type="histogram",
            unit="ms",
            default_aggregation="p99",
            labels=["tenant"],
        )
        metric_name, vector_query = get_range_promql(histogram_p99, request_histogram)
        assert metric_name == 'dashfrog_test_histogram{tenant="test"}'
        assert (
            vector_query
            == 'histogram_quantile(0.99, sum by (tenant)(rate(dashfrog_test_histogram{tenant="test"}[300s])))'
        )

        # Test 6: Counter with ratePerHour, no labels
        counter_rate_hour = Statistic(
            name="orders",
            pretty_name="Orders",
            type="counter",
            unit="count",
            default_aggregation="ratePerHour",
            labels=[],
        )
        metric_name, vector_query = get_range_promql(counter_rate_hour, request_no_labels)
        assert metric_name == "dashfrog_orders"
        assert vector_query == "sum(rate(dashfrog_orders[300s]))"

    def test_instant_endpoint(self, setup_dashfrog):
        """Test the /instant endpoint by actually inserting data and querying Prometheus."""

        uuid = str(uuid4()).replace("-", "_")

        # Create a counter with labels
        counter = Counter(
            name=f"test_instant_counter_{uuid}",
            labels=["region"],
            pretty_name="Test Instant Counter",
            unit="count",
            default_aggregation="sum",
        )

        # Insert data with specific label
        counter.add(0, tenant="instant_test_tenant", region="us-east")
        counter.add(0, tenant="instant_test_tenant", region="us-west")

        # Wait for metrics to appear in Prometheus
        wait_for_metric_in_prometheus(f"dashfrog_{counter.name}", max_wait=60)

        counter.add(10, tenant="instant_test_tenant", region="us-east")
        counter.add(20, tenant="instant_test_tenant", region="us-west")

        time.sleep(10)

        # Query the instant endpoint
        client = TestClient(app)
        now = datetime.now(timezone.utc)
        start_time = now - timedelta(minutes=1)

        response = client.post(
            "/statistics/instant",
            json={
                "statistic_name": counter.name,
                "start_time": start_time.isoformat(),
                "end_time": now.isoformat(),
                "labels": [{"key": "region", "value": "us-east"}],
            },
        )

        assert response.status_code == 200
        data = response.json()

        # Verify response structure
        assert len(data) == 1
        assert data[0]["statistic_name"] == counter.name
        assert data[0]["labels"]["region"] == "us-east"

        # Value should be close to 10
        # Allow tolerance for Prometheus increase() extrapolation
        assert data[0]["value"] >= 9
        assert data[0]["value"] <= 11

        # Test 2: Query for different region
        response = client.post(
            "/statistics/instant",
            json={
                "statistic_name": counter.name,
                "start_time": start_time.isoformat(),
                "end_time": now.isoformat(),
                "labels": [{"key": "region", "value": "us-west"}],
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["labels"]["region"] == "us-west"
        assert data[0]["value"] >= 19
        assert data[0]["value"] <= 23

        # Test 3: Query without label filter - should return both regions
        response = client.post(
            "/statistics/instant",
            json={
                "statistic_name": counter.name,
                "start_time": start_time.isoformat(),
                "end_time": now.isoformat(),
                "labels": [],
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2
        us_east_data = [d for d in data if d["labels"]["region"] == "us-east"]
        us_west_data = [d for d in data if d["labels"]["region"] == "us-west"]
        assert len(us_east_data) == 1
        assert len(us_west_data) == 1
        assert us_east_data[0]["value"] >= 9
        assert us_east_data[0]["value"] <= 11
        assert us_west_data[0]["value"] >= 19
        assert us_west_data[0]["value"] <= 23

    def test_range_endpoint(self, setup_dashfrog):
        """Test the /range endpoint by actually inserting data and querying Prometheus."""

        uuid = str(uuid4()).replace("-", "_")

        # Create a histogram with labels
        histogram = Histogram(
            name=f"test_range_histogram_{uuid}",
            labels=["tenant"],
            pretty_name="Test Range Histogram",
            unit="ms",
            default_aggregation="p50",
        )

        # Record some latency values
        histogram.record(1000, tenant="range_test_tenant")
        histogram.record(1000, tenant="range_test_tenant")

        wait_for_metric_in_prometheus(f"dashfrog_{histogram.name}", max_wait=90)

        histogram.record(1000, tenant="range_test_tenant")
        time.sleep(10)

        # Query the range endpoint
        client = TestClient(app)
        now = datetime.now(timezone.utc)
        start_time = now - timedelta(minutes=60)

        response = client.post(
            "/statistics/range",
            json={
                "statistic_name": histogram.name,
                "start_time": start_time.isoformat(),
                "end_time": now.isoformat(),
                "labels": [{"key": "tenant", "value": "range_test_tenant"}],
            },
        )

        assert response.status_code == 200
        data = response.json()[0]

        # Verify response structure
        assert data["statistic_name"] == histogram.name
        assert data["labels"]["tenant"] == "range_test_tenant"
        assert 999 <= data["values"][0]["value"] <= 1001
        assert datetime.fromisoformat(data["values"][0]["timestamp"]).date() == now.date()

    def test_get_range_resolution(self, setup_dashfrog):
        """Test that get_range_resolution returns appropriate step sizes for different time ranges."""

        now = datetime.now(timezone.utc)

        # Test 1: Very short range (1 minute) -> 15s step
        start = now - timedelta(minutes=1)
        assert get_range_resolution(start, now) == "15s"

        # Test 2: Short range (5 minutes) -> 15s step
        start = now - timedelta(minutes=5)
        assert get_range_resolution(start, now) == "15s"

        # Test 3: 15 minutes (ideal=3.6s) -> 15s step
        start = now - timedelta(minutes=15)
        assert get_range_resolution(start, now) == "15s"

        # Test 4: 30 minutes (ideal=7.2s) -> 15s step
        start = now - timedelta(minutes=30)
        assert get_range_resolution(start, now) == "15s"

        # Test 5: 1 hour (ideal=14.4s) -> 15s step
        start = now - timedelta(hours=1)
        assert get_range_resolution(start, now) == "15s"

        # Test 6: 3 hours (ideal=43.2s) -> 1m step
        start = now - timedelta(hours=3)
        assert get_range_resolution(start, now) == "1m"

        # Test 7: 6 hours (ideal=86.4s) -> 2m step
        start = now - timedelta(hours=6)
        assert get_range_resolution(start, now) == "2m"

        # Test 8: 12 hours (ideal=172.8s) -> 5m step
        start = now - timedelta(hours=12)
        assert get_range_resolution(start, now) == "5m"

        # Test 9: 24 hours / 1 day (ideal=345.6s) -> 10m step
        start = now - timedelta(days=1)
        assert get_range_resolution(start, now) == "10m"

        # Test 10: 3 days (ideal=1036.8s) -> 30m step
        start = now - timedelta(days=3)
        assert get_range_resolution(start, now) == "30m"

        # Test 11: 7 days / 1 week (ideal=2419.2s) -> 1h step
        start = now - timedelta(days=7)
        assert get_range_resolution(start, now) == "1h"

        # Test 12: 14 days / 2 weeks (ideal=4838.4s) -> 2h step
        start = now - timedelta(days=14)
        assert get_range_resolution(start, now) == "2h"

        # Test 13: 30 days / 1 month (ideal=10368s) -> 6h step
        start = now - timedelta(days=30)
        assert get_range_resolution(start, now) == "6h"

        # Test 14: 90 days / 3 months (ideal=31104s) -> 12h step
        start = now - timedelta(days=90)
        assert get_range_resolution(start, now) == "12h"

        # Test 15: 180 days / 6 months (ideal=62208s) -> 1d step
        start = now - timedelta(days=180)
        assert get_range_resolution(start, now) == "1d"

        # Test 16: 365 days / 1 year (ideal=126144s) -> 1d step
        start = now - timedelta(days=365)
        assert get_range_resolution(start, now) == "1d"

        # Test 17: 2 years (ideal=252288s) -> 1d step (max)
        start = now - timedelta(days=730)
        assert get_range_resolution(start, now) == "1d"
