from dataclasses import dataclass, field
from enum import Enum
from os import environ

from clickhouse_connect.driver.client import Client
from pydantic import BaseModel
from pydantic_settings import (
    BaseSettings,
    JsonConfigSettingsSource,
    PydanticBaseSettingsSource,
    SettingsConfigDict,
    YamlConfigSettingsSource,
)

from opentelemetry.metrics import Histogram

DASHFROG_TRACE_KEY = "dashfrog"


def get_file_name(file_name: str) -> str:
    return file_name.split(".")[0]


def clean_methods(val: str) -> str:
    return (
        val.replace("GET", "")
        .replace("POST", "")
        .replace("PUT", "")
        .replace("PATCH", "")
        .replace("OPTION", "")
        .replace("DELETE", "")
        .strip()
    )


class SupportedInstrumentation(str, Enum):
    HTTPX = "httpx"
    REQUESTS = "requests"
    FASTAPI = "fastapi"
    FLASK = "flask"
    CELERY = "celery"
    AWS_LAMBDA = "aws_lambda"

    def group(self) -> str:
        match self:
            case SupportedInstrumentation.HTTPX:
                return "http"
            case SupportedInstrumentation.REQUESTS:
                return "http"
            case SupportedInstrumentation.FASTAPI:
                return "web"
            case SupportedInstrumentation.FLASK:
                return "web"
            case SupportedInstrumentation.CELERY:
                return "tasks"
            case SupportedInstrumentation.AWS_LAMBDA:
                return "tasks"
            case _:
                raise ValueError(f"Unsupported instrumentation: {self}")


class Config(BaseSettings):
    """
    Dashfrog configuration data.

    Config is autopopulated from env variables or .env (dashfrog_FIELD), JSON or YAML file.
    Loaded files:
    - dashfrog.env
    - dashfrog.json
    - dashfrog.yaml
    """

    class Infra(BaseModel):
        disable_grpc: bool = False
        http_collector_port: int = 4318
        grpc_collector_port: int = 4317
        grpc_insecure: bool = False

    class AutoFlow(BaseModel):
        label_key: str
        web_value: str  # fast_api, flask & web servers
        http_value: str  # request/httpx
        tasks_value: str  # celery

    class Database(BaseModel):
        host: str = "0.0.0.0"
        user: str = "dev"
        database: str = "dashfrog"
        port: int | None = None
        password: str

    collector_server: str
    metric_exporter_delay: int = 3000
    auto_flow_instrumented: list[SupportedInstrumentation] = []  # use keys
    auto_steps_instrumented: list[SupportedInstrumentation] = []
    debug: bool = False

    clickhouse: Database = Database(password="dev-pwd*")
    infra: Infra = Infra()
    auto_steps: AutoFlow | None = None

    model_config = SettingsConfigDict(
        env_prefix="dashfrog_",
        env_ignore_empty=True,
        env_nested_delimiter=".",
        env_parse_enums=True,
        extra="ignore",
        env_file="dashfrog.env",
        json_file=(get_file_name(environ.get("DASHFROG_CONFIG_FILE_NAME") or "dashfrog") + ".json"),
        yaml_file=(get_file_name(environ.get("DASHFROG_CONFIG_FILE_NAME") or "dashfrog") + ".yaml"),
    )

    @classmethod
    def settings_customise_sources(  # type: ignore[override] passed as kwargs in underling code
        cls,
        settings_cls: type[BaseSettings],
        env_settings: PydanticBaseSettingsSource,
        dotenv_settings: PydanticBaseSettingsSource,
        **_,
    ) -> tuple[PydanticBaseSettingsSource, ...]:
        return (
            # Load env settings first so providing an env var at runtime
            # always overrides config from files.
            env_settings,
            JsonConfigSettingsSource(settings_cls),
            YamlConfigSettingsSource(settings_cls),
            # Load env settings last so any other way to configure overrides..
            dotenv_settings,
        )


@dataclass
class Observable:
    """Observable metrics support"""

    metric: Histogram
    default_labels: dict = field(default_factory=dict)

    def observe(self, value: int | float, **labels):
        """Add value to observable metric."""
        self.metric.record(value, {**self.default_labels, **labels})


# Singletons
clickhouse_client: Client | None = None


def set_singletons(client: Client):
    global clickhouse_client
    if not clickhouse_client:
        clickhouse_client = client


def get_clickhouse() -> Client:
    if not clickhouse_client:
        raise UnboundLocalError("Clickhouse not initialized")

    return clickhouse_client
