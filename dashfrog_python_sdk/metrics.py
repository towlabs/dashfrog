from abc import ABC, abstractmethod
from enum import Enum

from opentelemetry.sdk.metrics import Meter


class Kind(str, Enum):
    COUNTER = "counter"
    MEASURE = "measure"
    STATISTIC = "statistic"


class Metric(ABC):
    """Observable metrics support"""

    name: str
    default_labels: dict

    def __init__(self, **labels):
        self.default_labels = {f"dashfrog.label.glob.{key}": value for key, value in labels.items()}

    def __repr__(self):
        return f"<Observable::({self.name!r})>"

    @abstractmethod
    def record(self, value: int | float, **labels):
        """Add value to observable metric."""

        raise NotImplementedError()

    def _prepare_labels(self, labels: dict) -> dict:
        return {f"dashfrog.label.{key}": value for key, value in labels.items()}


def new_metric(meter: Meter, kind: Kind, name: str, description: str, unit: str, **labels) -> Metric:
    match kind:
        case Kind.COUNTER:
            return __Counter(meter, name, description, unit, **labels)
        case Kind.MEASURE:
            return __Measure(meter, name, description, unit, **labels)
        case Kind.STATISTIC:
            return __Statistic(meter, name, description, unit, **labels)
        case _:
            raise ValueError(f"Invalid kind: {kind}")


class __Counter(Metric):
    def __init__(self, meter: Meter, name: str, description: str, unit: str, **labels):
        super().__init__(**labels)
        self.__meter = meter.create_counter(f"{name}_counter", unit, description)

    def record(self, value: int | float, **labels):
        self.__meter.add(value, {**self._prepare_labels(labels), **self.default_labels})

        return self


class __Measure(Metric):
    def __init__(self, meter: Meter, name: str, description: str, unit: str, **labels):
        super().__init__(**labels)
        self.__meter = meter.create_gauge(f"{name}_measure", unit, description)

    def record(self, value: int | float, **labels):
        self.__meter.set(value, {**self._prepare_labels(labels), **self.default_labels})

        return self


class __Statistic(Metric):
    def __init__(self, meter: Meter, name: str, description: str, unit: str, **labels):
        super().__init__(**labels)
        self.__meter = meter.create_histogram(f"{name}_stats", unit, description)

    def record(self, value: int | float, **labels):
        self.__meter.record(value, {**self._prepare_labels(labels), **self.default_labels})

        return self
