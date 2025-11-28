from dataclasses import dataclass, field
from functools import wraps
import time
from typing import Callable, Iterator, Literal, Protocol

from .constants import MetricUnitT
from .dashfrog import get_dashfrog_instance

from opentelemetry.metrics import (
    CallbackOptions,
    Counter as OTelCounter,
    Histogram as OTelHistogram,
    ObservableGauge as OTelObservableGauge,
    Observation,
)


@dataclass
class Counter:
    """Create a counter metric. Counter metrics are used to count the number of events or occurrences (for example, requests).

    Args:
        name: The name of the metric.
        labels: The labels of the metric.
        pretty_name: The pretty name of the metric.
        unit: The unit of the metric.
        aggregation: The default aggregation of the metric.
    """

    name: str
    labels: list[str]
    pretty_name: str
    unit: MetricUnitT
    _otel_counter: OTelCounter = field(init=False)

    def __post_init__(self):
        dashfrog = get_dashfrog_instance()
        self._otel_counter = dashfrog.register_metric(
            metric_type="counter",
            metric_name=self.name,
            pretty_name=self.pretty_name,
            unit=self.unit,
            labels=self.labels,
        )

    def add(self, amount: int | float, tenant: str, **labels: str) -> None:
        self._otel_counter.add(amount, attributes=dict(labels, tenant=tenant))


@dataclass
class Histogram:
    """Create a histogram metric. Histogram metrics are used to record the distribution of values (for example, latencies).

    Args:
        name: The name of the metric.
        labels: The labels of the metric.
        pretty_name: The pretty name of the metric.
        unit: The unit of the metric.
        aggregation: The default aggregation of the metric.
    """

    name: str
    labels: list[str]
    pretty_name: str
    unit: MetricUnitT
    _otel_histogram: OTelHistogram = field(init=False)

    def __post_init__(self):
        dashfrog = get_dashfrog_instance()
        self._otel_histogram = dashfrog.register_metric(
            metric_type="histogram",
            metric_name=self.name,
            pretty_name=self.pretty_name,
            unit=self.unit,
            labels=self.labels,
        )

    def record(self, value: int | float, tenant: str, **labels: str) -> None:
        self._otel_histogram.record(value, attributes=dict(labels, tenant=tenant))


@dataclass
class GaugeValue:
    value: float | int
    tenant: str
    labels: dict[str, str]


class CallbackP(Protocol):
    def __call__(self, *, timeout_seconds: int) -> Iterator[GaugeValue]:
        """Callback to fetch the value of the metric.

        Args:
            timeout_seconds: The timeout in seconds.

        Returns:
            An iterator of GaugeValue objects.
        """
        ...


@dataclass
class Gauge:
    """Create a gauge metric. Gauge metrics are used to track the value of a metric (for example, the number of users online).

    Args:
        name: The name of the metric.
        labels: The labels of the metric.
        pretty_name: The pretty name of the metric.
        unit: The unit of the metric.
    """

    name: str
    labels: list[str]
    pretty_name: str
    unit: MetricUnitT
    _otel_gauge: OTelObservableGauge = field(init=False)
    _cached_values: list[GaugeValue] | None = field(init=False, default=None)
    _cached_time: float | None = field(init=False, default=None)

    def set_periodically(self, period_in_seconds: int, callback: CallbackP) -> None:
        dashfrog = get_dashfrog_instance()

        @wraps(callback)
        def _callback(options: CallbackOptions):
            values = self._cached_values
            if values is None or self._cached_time is None or time.time() - self._cached_time >= period_in_seconds:
                values = list(callback(timeout_seconds=int(options.timeout_millis / 1000)))
                self._cached_values = values
                self._cached_time = time.time()

            for value in values:
                yield Observation(value=value.value, attributes={**value.labels, "tenant": value.tenant})

        self._otel_gauge = dashfrog.register_metric(
            metric_type="gauge",
            metric_name=self.name,
            pretty_name=self.pretty_name,
            unit=self.unit,
            labels=self.labels,
            callback=_callback,
        )
