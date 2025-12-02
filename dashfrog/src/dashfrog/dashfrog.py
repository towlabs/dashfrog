from dataclasses import dataclass, field
from typing import TYPE_CHECKING, Literal, overload
import uuid

from sqlalchemy import Engine, create_engine
from sqlalchemy.dialects.postgresql import insert

from .config import Config
from .constants import MetricUnitT
from .models import (
    Flow,
    Metric as MetricModel,
)

from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import OTLPMetricExporter
from opentelemetry.metrics import CallbackT, Histogram, Instrument, Meter, ObservableGauge
from opentelemetry.sdk.metrics import Counter, MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.sdk.metrics.view import ExponentialBucketHistogramAggregation, View
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.trace import (
    NoOpTracerProvider,
    ProxyTracerProvider,
    get_tracer_provider,
    set_tracer_provider,
)

if TYPE_CHECKING:
    from fastapi import FastAPI
    from flask import Flask  # pyright: ignore[reportMissingImports]


@dataclass
class Dashfrog:
    """Internal state container for DashFrog SDK."""

    config: Config

    db_engine: Engine = field(init=False)
    meter: Meter = field(init=False)
    resource: Resource = field(init=False)

    _flows: set[str] = field(init=False, default_factory=set)
    _metrics: set[str] = field(init=False, default_factory=set)

    def __post_init__(self):
        # Build resource
        self.resource = Resource.create(
            attributes={
                "service.instance.id": str(uuid.uuid4()),
                "service.name": "dashfrog",
            }
        )

        # trace provider
        trace_provider = get_tracer_provider()
        if isinstance(trace_provider, (NoOpTracerProvider, ProxyTracerProvider)):
            set_tracer_provider(TracerProvider(resource=self.resource))

        # Create meter
        insecure, endpoint = self.parse_otel_config(self.config.otlp_endpoint)
        exporter = OTLPMetricExporter(endpoint=endpoint, insecure=insecure)
        reader = PeriodicExportingMetricReader(exporter, export_interval_millis=1000)
        meter_provider = MeterProvider(
            metric_readers=[reader],
            resource=self.resource,
            views=[
                View(
                    instrument_type=Histogram,
                    aggregation=ExponentialBucketHistogramAggregation(),
                )
            ],
        )
        self.meter = meter_provider.get_meter("dashfrog")

        # Create SQLAlchemy engine with connection pooling
        db_url = (
            f"postgresql://{self.config.postgres_user}:{self.config.postgres_password}"
            f"@{self.config.postgres_host}:{self.config.postgres_port}/{self.config.postgres_dbname}"
        )
        self.db_engine = create_engine(
            db_url,
            pool_size=5,
            max_overflow=10,
            pool_pre_ping=True,  # Verify connections before using
            pool_recycle=3600,  # Recycle connections after 1 hour
        )

    @staticmethod
    def parse_otel_config(endpoint: str) -> tuple[bool, str]:
        """
        Parse OTLP endpoint to determine protocol and security.

        Returns:
            (insecure, processed_endpoint): Tuple of insecure flag and processed endpoint

        Examples:
            "grpcs://host:4317" → (False, "host:4317")  # gRPC with TLS
            "host:4317" → (True, "host:4317")  # Defaults to gRPC insecure
        """
        if endpoint.startswith("grpcs://"):
            # gRPC with TLS
            return False, endpoint.replace("grpcs://", "")
        # Plain host:port defaults to gRPC insecure (for dev)
        return True, endpoint

    def register_flow(self, flow_name: str, *labels: str) -> None:
        if flow_name in self._flows:
            return

        with self.db_engine.begin() as conn:
            conn.execute(
                insert(Flow)
                .values(name=flow_name, labels=list(labels))
                .on_conflict_do_update(index_elements=[Flow.name], set_=dict(labels=list(labels)))
            )
        self._flows.add(flow_name)

    @overload
    def register_metric(
        self,
        metric_type: Literal["counter"],
        metric_name: str,
        pretty_name: str,
        unit: MetricUnitT,
        labels: list[str],
        callback: None = None,
    ) -> Counter: ...

    @overload
    def register_metric(
        self,
        metric_type: Literal["histogram"],
        metric_name: str,
        pretty_name: str,
        unit: MetricUnitT,
        labels: list[str],
        callback: None = None,
    ) -> Histogram: ...

    @overload
    def register_metric(
        self,
        metric_type: Literal["gauge"],
        metric_name: str,
        pretty_name: str,
        unit: MetricUnitT,
        labels: list[str],
        *,
        callback: CallbackT,
    ) -> ObservableGauge: ...

    @overload
    def register_metric(
        self,
        metric_type: Literal["counter", "histogram", "gauge"],
        metric_name: str,
        pretty_name: str,
        unit: MetricUnitT,
        labels: list[str],
        callback: CallbackT | None = None,
    ) -> Instrument: ...

    def register_metric(
        self,
        metric_type: Literal["counter", "histogram", "gauge"],
        metric_name: str,
        pretty_name: str,
        unit: MetricUnitT,
        labels: list[str],
        callback: CallbackT | None = None,
    ) -> Instrument:
        if metric_name not in self._metrics:
            with self.db_engine.begin() as conn:
                conn.execute(
                    insert(MetricModel)
                    .values(
                        name=metric_name,
                        pretty_name=pretty_name,
                        type=metric_type,
                        unit=unit,
                        labels=list(labels),
                    )
                    .on_conflict_do_update(
                        index_elements=[MetricModel.name],
                        set_=dict(
                            pretty_name=pretty_name,
                            type=metric_type,
                            unit=unit,
                            labels=list(labels),
                        ),
                    )
                )
            self._metrics.add(metric_name)

        if metric_type == "counter":
            return self.meter.create_counter(metric_name, description=metric_name)
        elif metric_type == "histogram":
            return self.meter.create_histogram(metric_name, description=metric_name)
        else:
            assert callback is not None
            return self.meter.create_observable_gauge(metric_name, description=metric_name, callbacks=[callback])

    @staticmethod
    def with_flask(flask_app: "Flask") -> None:
        """Instrument a Flask application."""
        from opentelemetry.instrumentation.flask import FlaskInstrumentor

        FlaskInstrumentor.instrument_app(
            flask_app,
        )

    @staticmethod
    def with_fastapi(fastapi_app: "FastAPI") -> None:
        """Instrument a FastAPI application."""
        from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor

        FastAPIInstrumentor.instrument_app(
            fastapi_app,
        )

    @staticmethod
    def with_requests() -> None:
        """Instrument requests library."""
        from opentelemetry.instrumentation.requests import RequestsInstrumentor

        RequestsInstrumentor().instrument()

    @staticmethod
    def with_httpx() -> None:
        """Instrument httpx library."""
        from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor

        HTTPXClientInstrumentor().instrument()

    @staticmethod
    def with_celery() -> None:
        """Instrument Celery."""
        from opentelemetry.instrumentation.celery import CeleryInstrumentor

        CeleryInstrumentor().instrument()

    @staticmethod
    def with_aws_lambda() -> None:
        """Instrument AWS Lambda."""
        from opentelemetry.instrumentation.aws_lambda import AwsLambdaInstrumentor
        from opentelemetry.instrumentation.botocore import BotocoreInstrumentor

        BotocoreInstrumentor().instrument()
        AwsLambdaInstrumentor().instrument()


# Module-level state
_dashfrog: Dashfrog | None = None


def setup(
    config: Config | None = None,
    *,
    run_migrations: bool = True,
) -> None:
    """
    Initialize DashFrog observability.

    Args:
        config: Optional Config object (defaults to reading from environment)
        run_migrations: If True, automatically run database migrations during setup.
                       Default is False - call create_tables() explicitly instead.

    Example:
        from dashfrog import setup

        # Setup without migrations (run create_tables() later)
        setup()

        # Setup with automatic migrations
        setup(run_migrations=True)
    """
    global _dashfrog

    _dashfrog = Dashfrog(config or Config())

    if run_migrations:
        from .migrations import run_migrations as run_db_migrations

        run_db_migrations(_dashfrog.db_engine)


def get_dashfrog_instance() -> Dashfrog:
    """Raise error if setup() hasn't been called."""
    if _dashfrog is None:
        raise RuntimeError("DashFrog not initialized. Call setup() first:\n\n  from dashfrog import setup\n  setup()\n")
    return _dashfrog
