from dataclasses import dataclass, field
from typing import Literal

from .constants import StatisticUnitT
from .dashfrog import get_dashfrog_instance

from opentelemetry.metrics import (
    Counter as OTelCounter,
    Histogram as OTelHistogram,
)


@dataclass
class Counter:
    """Create a counter metric. Counter metrics are used to count the number of events or occurrences (for example, requests).

    Args:
        name: The name of the metric.
        labels: The labels of the metric.
        pretty_name: The pretty name of the metric.
        unit: The unit of the metric.
        default_aggregation: The default aggregation of the metric.
    """

    name: str
    labels: list[str]
    pretty_name: str
    unit: StatisticUnitT
    default_aggregation: Literal["sum", "ratePerSecond", "ratePerMinute", "ratePerHour", "ratePerDay"]
    _otel_counter: OTelCounter = field(init=False)

    def __post_init__(self):
        dashfrog = get_dashfrog_instance()
        self._otel_counter = dashfrog.register_statistic(
            statistic_type="counter",
            statistic_name=self.name,
            pretty_name=self.pretty_name,
            unit=self.unit,
            labels=self.labels,
            default_aggregation=self.default_aggregation,
        )

    def add(self, amount: int | float, tenant: str, **labels: str) -> None:
        self._otel_counter.add(amount, attributes=dict(labels, tenant=tenant))


@dataclass
class Histogram:
    name: str
    labels: list[str]
    pretty_name: str
    unit: StatisticUnitT
    default_aggregation: Literal["p50", "p90", "p95", "p99"]
    _otel_histogram: OTelHistogram = field(init=False)

    def __post_init__(self):
        dashfrog = get_dashfrog_instance()
        self._otel_histogram = dashfrog.register_statistic(
            statistic_type="histogram",
            statistic_name=self.name,
            pretty_name=self.pretty_name,
            unit=self.unit,
            labels=self.labels,
            default_aggregation=self.default_aggregation,
        )

    def record(self, value: int | float, tenant: str, **labels: str) -> None:
        self._otel_histogram.record(value, attributes=dict(labels, tenant=tenant))
