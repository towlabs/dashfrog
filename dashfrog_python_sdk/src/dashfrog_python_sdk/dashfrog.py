from dataclasses import dataclass, field
from typing import TYPE_CHECKING
import uuid

from sqlalchemy import Engine, create_engine

from .config import Config

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
    from flask import Flask


@dataclass
class Dashfrog:
    """Internal state container for DashFrog SDK."""

    config: Config

    db_engine: Engine = field(init=False)
    last_refresh_ts: float | None = field(default=None, init=False)

    def __post_init__(self):
        trace_provider = get_tracer_provider()
        if isinstance(trace_provider, (NoOpTracerProvider, ProxyTracerProvider)):
            # Build resource
            resource = Resource.create(
                attributes={
                    "service.instance.id": str(uuid.uuid4()),
                    "service.name": "dashfrog",
                }
            )
            set_tracer_provider(TracerProvider(resource=resource))

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
    def parse_otel_config(endpoint: str) -> tuple[bool, bool, str]:
        """
        Parse OTLP endpoint to determine protocol and security.

        Returns:
            (use_http, insecure, processed_endpoint)

        Examples:
            "localhost:4317" → (False, True, "localhost:4317")  # gRPC insecure
            "grpc://host:4317" → (False, True, "host:4317")  # gRPC insecure
            "grpcs://host:4317" → (False, False, "host:4317")  # gRPC with TLS
            "http://host:4318" → (True, False, "http://host:4318")  # HTTP
            "https://host:4318" → (True, False, "https://host:4318")  # HTTP with TLS
        """
        if endpoint.startswith("https://"):
            # HTTPS already includes the scheme, keep it
            return True, False, f"{endpoint}/v1/metrics"
        elif endpoint.startswith("http://"):
            # HTTP already includes the scheme, keep it
            return True, False, f"{endpoint}/v1/metrics"
        elif endpoint.startswith("grpcs://"):
            # gRPC with TLS
            return False, False, endpoint.replace("grpcs://", "")
        elif endpoint.startswith("grpc://"):
            # gRPC without TLS
            return False, True, endpoint.replace("grpc://", "")
        else:
            # Plain host:port defaults to gRPC insecure (for dev)
            return False, True, endpoint

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
        from dashfrog_python_sdk import setup

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
        raise RuntimeError(
            "DashFrog not initialized. Call setup() first:\n\n  from dashfrog_python_sdk import setup\n  setup()\n"
        )
    return _dashfrog


def refresh_views(*, concurrent: bool = True) -> None:
    """
    Refresh the Flow and Label materialized views.

    This updates the materialized views with the latest data from the Event table.
    Should be called periodically or after bulk inserts to keep views up-to-date.

    Args:
        concurrent: If True, uses REFRESH MATERIALIZED VIEW CONCURRENTLY which
                   allows reads during refresh but requires unique indexes (default: True)

    Example:
        from dashfrog_python_sdk import refresh_views

        # After processing events
        refresh_views()

        # Or schedule periodically
        # schedule.every(5).minutes.do(refresh_views)
    """
    from sqlalchemy import text

    dashfrog = get_dashfrog_instance()

    refresh_cmd = "REFRESH MATERIALIZED VIEW CONCURRENTLY" if concurrent else "REFRESH MATERIALIZED VIEW"

    with dashfrog.db_engine.connect() as conn:
        conn.execute(text(f"{refresh_cmd} flow"))
        conn.execute(text(f"{refresh_cmd} label"))
        conn.commit()
