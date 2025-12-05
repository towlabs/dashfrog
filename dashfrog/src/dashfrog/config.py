from os import environ

from pydantic import BaseModel

DASHFROG_TRACE_KEY = "dashfrog"


class Config(BaseModel):
    """
    DashFrog configuration from environment variables.

    All settings have Docker-friendly defaults. Only override what you need.

    Example:
        # Use defaults (works with docker-compose)
        config = Config()

        # Override specific settings
        config = Config(
            postgres_password="my-password",
            otlp_auth_token="my-token"
        )
    """

    # Database
    postgres_host: str = environ.get("DASHFROG_POSTGRES_HOST", "localhost")
    postgres_port: int = int(environ.get("DASHFROG_POSTGRES_PORT", "5432"))
    postgres_dbname: str = environ.get("DASHFROG_POSTGRES_DBNAME", "dashfrog")
    postgres_user: str = environ.get("DASHFROG_POSTGRES_USER", "postgres")
    postgres_password: str = environ.get("DASHFROG_POSTGRES_PASSWORD", "postgres")

    # Telemetry
    otlp_endpoint: str = environ.get("DASHFROG_OTLP_ENDPOINT", "grpc://localhost:4317")
    otlp_auth_token: str | None = environ.get("DASHFROG_OTLP_AUTH_TOKEN", "pwd")
    prometheus_endpoint: str = environ.get("DASHFROG_PROMETHEUS_ENDPOINT", "http://prometheus:9090")

    # API
    api_username: str = environ.get("DASHFROG_API_USERNAME", "admin")
    api_password: str = environ.get("DASHFROG_API_PASSWORD", "admin")
    api_secret_key: str = environ.get("DASHFROG_API_SECRET_KEY", "change-this-secret-key-in-production")
