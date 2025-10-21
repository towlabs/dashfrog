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

from .metrics import Metric

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
        host: str = "localhost"
        user: str = "dev"
        database: str = "dashfrog"
        port: int | None = None
        password: str

    collector_server: str
    metric_exporter_delay: int = 3000
    auto_flow_instrumented: list[SupportedInstrumentation] = []  # use keys
    auto_steps_instrumented: list[SupportedInstrumentation] = []
    debug: bool = False

    clickhouse: Database = Database(password="dev-pwd*")  # nosec (unsafe unused pwd)
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


# Singletons
clickhouse_client: Client | None = None
workflow_status: Metric | None = None
workflow_duration: Metric | None = None
step_status: Metric | None = None
step_duration: Metric | None = None


def set_singletons(
    client: Client,
    wf_status: Metric | None = None,
    wf_duration: Metric | None = None,
    st_status: Metric | None = None,
    st_duration: Metric | None = None,
):
    global clickhouse_client
    if not clickhouse_client:
        clickhouse_client = client

    global workflow_status
    if not workflow_status:
        workflow_status = wf_status

    global workflow_duration
    if not workflow_duration:
        workflow_duration = wf_duration

    global step_status
    if not step_status:
        step_status = st_status

    global step_duration
    if not step_duration:
        step_duration = st_duration


def get_clickhouse() -> Client:
    if not clickhouse_client:
        raise UnboundLocalError("Clickhouse not initialized")

    return clickhouse_client


def get_workflow_status() -> Metric:
    if not workflow_status:
        raise UnboundLocalError("Workflow status not initialized")

    return workflow_status


def get_workflow_duration() -> Metric:
    if not workflow_duration:
        raise UnboundLocalError("Workflow duration not initialized")

    return workflow_duration


def get_step_status() -> Metric:
    if not step_status:
        raise UnboundLocalError("Step status not initialized")

    return step_status


def get_step_duration() -> Metric:
    if not step_duration:
        raise UnboundLocalError("Step duration not initialized")

    return step_duration
