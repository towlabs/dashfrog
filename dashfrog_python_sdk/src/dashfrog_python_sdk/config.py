from os import environ

from pydantic import BaseModel

DASHFROG_TRACE_KEY = "dashfrog"


class Config(BaseModel):
    """
    DashFrog configuration from environment variables.

    Required:
        DASHFROG_POSTGRES_HOST - Postgres host (default: "localhost")
        DASHFROG_POSTGRES_DBNAME - Postgres database name (default: "dashfrog")

    Optional:
        DASHFROG_POSTGRES_PORT=5432 - Postgres port
        DASHFROG_POSTGRES_USER=postgres - Postgres username
        DASHFROG_POSTGRES_PASSWORD="" - Postgres password

    Example:
        # From environment
        config = Config()

        # Override for testing
        config = Config(
            postgres_host="localhost",
            postgres_dbname="dashfrog_test"
        )
    """

    # Postgres
    postgres_host: str = environ.get("DASHFROG_POSTGRES_HOST", "localhost")
    postgres_port: int = int(environ.get("DASHFROG_POSTGRES_PORT", "5432"))
    postgres_dbname: str = environ.get("DASHFROG_POSTGRES_DBNAME", "dashfrog")
    postgres_user: str = environ.get("DASHFROG_POSTGRES_USER", "postgres")
    postgres_password: str = environ.get("DASHFROG_POSTGRES_PASSWORD", "")

    # OTLP
    otlp_endpoint: str = environ.get("DASHFROG_OTLP_ENDPOINT", "grpc://otel-collector:4317")

    # prometheus
    prometheus_endpoint: str = environ.get("DASHFROG_PROMETHEUS_ENDPOINT", "http://prometheus:9090")
