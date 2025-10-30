from os import environ

from pydantic import BaseModel

DASHFROG_TRACE_KEY = "dashfrog"


class Config(BaseModel):
    """
    DashFrog configuration from environment variables.

    Required:
        DASHFROG_OTEL_ENDPOINT - OTLP collector endpoint
        DASHFROG_POSTGRES_HOST - Postgres host (default: "localhost")
        DASHFROG_POSTGRES_DBNAME - Postgres database name (default: "dashfrog")

    Optional:
        DASHFROG_POSTGRES_PORT=5432 - Postgres port
        DASHFROG_POSTGRES_USER=postgres - Postgres username
        DASHFROG_POSTGRES_PASSWORD="" - Postgres password
        DASHFROG_EXPORT_INTERVAL_MS=3000 - Metric export interval

    OTEL_ENDPOINT format:
        - "localhost:4317" → gRPC insecure (development)
        - "grpc://host:4317" → gRPC insecure
        - "grpcs://host:4317" → gRPC with TLS
        - "http://host:4318" → HTTP without TLS
        - "https://host:4318" → HTTP with TLS

    Example:
        # From environment
        config = Config()

        # Override for testing
        config = Config(
            otel_endpoint="localhost:4317",
            postgres_host="localhost",
            postgres_dbname="dashfrog_test"
        )
    """

    # OpenTelemetry Collector
    otel_endpoint: str = environ.get("DASHFROG_OTEL_ENDPOINT", "localhost:4317")

    # Postgres
    postgres_host: str = environ.get("DASHFROG_POSTGRES_HOST", "localhost")
    postgres_port: int = int(environ.get("DASHFROG_POSTGRES_PORT", "5432"))
    postgres_dbname: str = environ.get("DASHFROG_POSTGRES_DBNAME", "dashfrog")
    postgres_user: str = environ.get("DASHFROG_POSTGRES_USER", "postgres")
    postgres_password: str = environ.get("DASHFROG_POSTGRES_PASSWORD", "")

    # Metrics
    export_interval_ms: int = int(environ.get("DASHFROG_EXPORT_INTERVAL_MS", "3000"))
