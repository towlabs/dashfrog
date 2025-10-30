from collections.abc import Sequence
from logging import warning

from dashfrog_python_sdk.dashfrog import get_dashfrog_instance

from opentelemetry.metrics import Meter


def _check_labels(labels: dict[str, str], expected: set[str]) -> bool:
    if set(labels.keys()) != expected:
        warning(f"Labels {labels} do not match expected {expected}")
        return False
    return True


class Count:
    """
    Count metric - tracks events/occurrences.

    Use when: An event occurs that you want to tally
    Examples: orders placed, errors thrown, emails sent
    """

    def __init__(self, meter: Meter, name: str, unit: str, labels: Sequence[str] | None = None):
        self._counter = meter.create_counter(name, unit)
        self._labels = set(labels or [])

    def increment(self, **labels: str):
        """Increment counter by 1."""
        if _check_labels(labels, self._labels):
            self._counter.add(1, labels)

    def add(self, value: int | float, **labels: str):
        """Add value to counter."""
        if _check_labels(labels, self._labels):
            self._counter.add(value, labels)


class Value:
    """
    Total metric - tracks current values/levels.

    Use when: You know the current value/level of something
    Examples: active users, inventory count, queue depth
    """

    def __init__(self, meter: Meter, name: str, unit: str, labels: Sequence[str] | None = None):
        self._gauge = meter.create_gauge(name, unit)
        self._labels = set(labels or [])

    def set(self, value: int | float, **labels: str):
        """Set the current value."""
        if _check_labels(labels, self._labels):
            self._gauge.set(value, labels)


class Measure:
    """
    Measure metric - tracks value distributions.

    Use when: You want to understand the distribution of values
    Examples: response times, request sizes, order amounts
    """

    def __init__(self, meter: Meter, name: str, unit: str, labels: Sequence[str] | None = None):
        self._histogram = meter.create_histogram(name, unit)
        self._labels = set(labels or [])

    def record(self, value: int | float, **labels: str):
        """Record a value."""
        if _check_labels(labels, self._labels):
            self._histogram.record(value, labels)
        return self


def count(name: str, unit: str = "", labels: Sequence[str] | None = None) -> Count:
    """
    Create a count metric for tracking events/occurrences.

    Use when: An event occurs that you want to tally
    Examples: orders placed, errors thrown, emails sent

    Args:
        name: Metric name
        description: What this metric measures
        unit: Unit of measurement (optional)
        **labels: Default labels to attach to all observations

    Returns:
        Count metric with increment() and add() methods

    Example:
        from dashfrog import count

        orders = count("orders_placed")
        orders.increment()  # Count one order
        orders.add(5, region="us-east")  # Count 5 orders with label
    """
    dashfrog = get_dashfrog_instance()
    return Count(
        dashfrog.meter,
        f"dashfrog_user_{name}",
        unit,
        labels,
    )


def value(name: str, unit: str = "", labels: Sequence[str] | None = None) -> Value:
    """
    Create a total metric for tracking current values/levels.

    Use when: You know the current value/level of something
    Examples: active users, inventory count, queue depth

    Args:
        name: Metric name
        unit: Unit of measurement (optional)
        labels: Default labels to attach to all observations

    Returns:
        Value metric with set() method

    Example:
        from dashfrog import value

        users = value("active_users")
        users.set(1542)
        users.set(1543, region="us-east")  # With label
    """
    dashfrog = get_dashfrog_instance()
    return Value(
        dashfrog.meter,
        f"dashfrog_user_{name}",
        unit,
        labels,
    )


def measure(name: str, unit: str = "", labels: Sequence[str] | None = None) -> Measure:
    """
    Create a measure metric for tracking value distributions.

    Use when: You want to understand the distribution of values
    Examples: response times, request sizes, order amounts

    Args:
        name: Metric name
        unit: Unit of measurement (optional)
        labels: Default labels to attach to all observations

    Returns:
        Measure metric with record() method

    Example:
        from dashfrog import measure

        latency = measure("api_latency", "ms")
        latency.record(127)
        latency.record(243, endpoint="/orders")  # With label
    """
    dashfrog = get_dashfrog_instance()
    return Measure(
        dashfrog.meter,
        f"dashfrog_user_{name}",
        unit,
        labels,
    )
