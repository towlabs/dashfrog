from dataclasses import dataclass, field
import logging
import os
from typing import Any

from axiom_py.client import Client
import clickhouse_connect
from clickhouse_connect.driver import Client as ClickhouseClient
import orjson
from pydantic import BaseModel
import sentry_sdk
from structlog.stdlib import BoundLogger

from src._inits import setup_logging
from src.context import ENV, RELEASE
from src.core import str_to_bool


class Configuration(BaseModel):
    url: str = "0.0.0.0:8080"
    env: str = "prod"
    release: str = "0.0.0"

    # Postgres
    # pg_user: str = "toweruser"
    # pg_db: str = "tower"
    # pg_host: str = "localhost"
    # pg_port: int = 5432
    # pg_password: str

    # Click house
    ck_host: str = "0.0.0.0"
    ck_user: str = "dev"
    ck_db: str = "dashfrog"
    ck_port: int | None = None
    ck_pwd: str

    # Logger configs
    log_libs: bool = True

    # sentry
    sentry_enabled: bool = True
    sentry_url: str = ""
    sentry_trace_rate: float = 0.1


@dataclass
class BaseApplication[Conf: BaseModel]:
    configuration_cls: type[Conf]
    configuration_path_env_var: str | None

    configuration: Conf = field(init=False)

    def __post_init__(self):
        configuration_json: dict[str, Any] = {}
        if self.configuration_path_env_var is not None:
            if configuration_path := os.environ.get(self.configuration_path_env_var):
                with open(configuration_path, "r") as f:
                    configuration_json = orjson.loads(f.read())
        else:
            configuration_json["url"] = os.environ.get("APP_URL", "0.0.0.0:8080")
            configuration_json["log_libs"] = str_to_bool(
                os.environ.get("LOG_LIBS", "t")
            )
            configuration_json["env"] = os.environ.get("APP_ENV") or "prod"
            configuration_json["release"] = os.environ.get("APP_RELEASE", "0.0.0")

            configuration_json["ck_host"] = os.environ.get("CLICK_HOST", "")
            configuration_json["ck_user"] = os.environ.get("CLICK_USER", "")
            configuration_json["ck_pwd"] = os.environ.get("CLICK_PASSWORD", "")
            configuration_json["ck_port"] = (
                int(os.environ["CLICK_PORT"]) if "CLICK_PORT" in os.environ else None
            )

            configuration_json["sentry_enabled"] = str_to_bool(
                os.environ.get("SENTRY_ENABLED", "t")
            )
            configuration_json["sentry_url"] = os.environ.get("SENTRY_URL", "")
            configuration_json["sentry_trace_rate"] = float(
                os.environ.get("SENTRY_TRACE", 0.1)
            )

        self.configuration = self.configuration_cls(**configuration_json)


@dataclass
class Application(BaseApplication[Configuration]):
    configuration_cls: type[Configuration] = Configuration
    configuration_path_env_var: str | None = None

    clickhouse_client: ClickhouseClient = field(init=False)
    axiom_client: Client = field(init=False)
    logger: BoundLogger = field(init=False)

    def __post_init__(self):
        super().__post_init__()

        ENV.set(self.configuration.env)
        RELEASE.set(self.configuration.release)

        if self.configuration.sentry_enabled:
            sentry_sdk.init(
                self.configuration.sentry_url,
                traces_sample_rate=self.configuration.sentry_trace_rate,
                environment=self.configuration.env,
                release=self.configuration.release,
            )

        self.clickhouse_client = clickhouse_connect.get_client(
            host=self.configuration.ck_host,
            user=self.configuration.ck_user,
            password="dev-pwd*",
        )

        self.axiom_client = Client()
        self.logger = setup_logging(self.axiom_client, env=self.configuration.env)

        if not self.configuration.log_libs:
            logging.getLogger("httpx").setLevel(logging.CRITICAL)

    def log(self, name: str, **kwargs) -> BoundLogger:
        return self.logger.bind(name=name, **kwargs)
