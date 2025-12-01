#!/usr/bin/env python3
"""
Script to populate Prometheus with sample metrics data.

This script creates counter and histogram metrics and sends data points to Prometheus
via the OpenTelemetry collector using the DashFrog SDK.

Usage:
    python scripts/populate_prometheus.py
"""

import random
import time

from dashfrog import setup
from dashfrog.metrics import Counter, Gauge, GaugeValue, Histogram

if __name__ == "__main__":
    setup()

    orders_counter = Counter(
        name="signups",
        labels=["region"],
        pretty_name="Signups",
        unit="",
    )

    order_duration_histogram = Histogram(
        name="revenue",
        labels=["region"],
        pretty_name="Revenue",
        unit="€",
    )

    def random_callback(*, timeout_seconds: int):
        yield from [
            GaugeValue(value=random.random(), labels={"region": "us"}, tenant="acme-corp"),
            GaugeValue(value=random.random(), labels={"region": "eu"}, tenant="acme-corp"),
        ]

    def uptime_callback(*, timeout_seconds: int):
        us_uptime = int(random.randint(0, 100) < 90)
        eu_uptime = int(random.randint(0, 100) < 20)
        yield from [
            GaugeValue(value=us_uptime, labels={"region": "us"}, tenant="acme-corp"),
            GaugeValue(value=eu_uptime, labels={"region": "eu"}, tenant="acme-corp"),
        ]

    def test_callback(*, timeout_seconds: int):
        yield from [
            GaugeValue(value=random.random(), labels={}, tenant="acme-corp"),
        ]

    uptime_gauge = Gauge(name="uptime_2", labels=["region"], pretty_name="Uptime 2", unit="").set_periodically(
        1, uptime_callback
    )
    gauge = Gauge(name="random_2", labels=["region"], pretty_name="Random 2", unit="").set_periodically(
        1, random_callback
    )
    Gauge(name="test_3", labels=[], pretty_name="Test 3", unit="").set_periodically(1, test_callback)

    while True:
        orders_counter.add(2, tenant="acme-corp", region="us")
        orders_counter.add(2, tenant="acme-corp", region="eu")
        orders_counter.add(2, tenant="fintech-app", region="us")
        order_duration_histogram.record(random.uniform(49, 51), tenant="acme-corp", region="us")
        order_duration_histogram.record(random.uniform(149, 151), tenant="fintech-app", region="us")
        time.sleep(5)
        orders_counter.add(1, tenant="acme-corp", region="us")
        order_duration_histogram.record(random.uniform(49, 51), tenant="acme-corp", region="us")
        time.sleep(5)
        print("Sleeping for 5 seconds")
