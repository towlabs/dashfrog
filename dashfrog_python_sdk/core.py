from dataclasses import dataclass, field
from os import environ

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

    collector_server: str
    metric_exporter_delay: int = 3000
    auto_flow_instrumented: bool = True

    infra: Infra = Infra()

    model_config = SettingsConfigDict(
        env_prefix="dashfrog_",
        env_ignore_empty=True,
        env_nested_delimiter=".",
        env_parse_enums=True,
        extra="ignore",
        env_file="dashfrog.env",
        json_file=(
            get_file_name(environ.get("DASHFROG_CONFIG_FILE_NAME") or "dashfrog")
            + ".json"
        ),
        yaml_file=(
            get_file_name(environ.get("DASHFROG_CONFIG_FILE_NAME") or "dashfrog")
            + ".yaml"
        ),
    )

    @classmethod
    def settings_customise_sources(
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

    def value(self, value: int | float, **labels):
        """Add value to observable metric."""
        self.metric.record(value, {**self.default_labels, **labels})
