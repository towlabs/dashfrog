from dataclasses import dataclass, field
import logging

import clickhouse_connect
from clickhouse_connect.driver.client import Client as ClickhouseClient
from fastapi import APIRouter
import orjson
from prometheus_api_client import PrometheusConnect
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from structlog._generic import BoundLogger

from _inits import setup_logging
from core import Config
from core.context import is_app_initialized, set_app
from routes import (
    events_router,
    flows_router,
    health_router,
    labels_router,
    metrics_router,
    notebook_router,
)


@dataclass
class BaseApplication[Conf: BaseModel]:
    configuration_cls: type[Conf]
    configuration_path_env_var: str | None

    configuration: Conf = field(init=False)

    def __post_init__(self):
        self.configuration = Config()  # type: ignore


@dataclass
class Application(BaseApplication[Config]):
    configuration_cls: type[Config] = Config
    configuration_path_env_var: str | None = None

    clickhouse_client: ClickhouseClient = field(init=False)
    prom_client: PrometheusConnect = field(init=False)
    logger: BoundLogger = field(init=False)

    def __post_init__(self):
        super().__post_init__()

        # Check if an app is already initialized and warn
        if is_app_initialized():
            logging.getLogger(__name__).warning(
                "Application instance already exists. Multiple app instances may cause conflicts."
            )

        # self.clickhouse_client = clickhouse_connect.get_client(
        #     host=self.configuration.click_house.host,
        #     port=self.configuration.click_house.port or 8123,
        #     user=self.configuration.click_house.user,
        #     password=self.configuration.click_house.password,
        #     database=self.configuration.click_house.database,
        #     autogenerate_session_id=False,
        # )

        # Build PostgreSQL connection string with optional port
        psql_host = self.configuration.psql.host
        if self.configuration.psql.port:
            psql_host = f"{psql_host}:{self.configuration.psql.port}"

        self.engine = create_async_engine(
            f"postgresql+asyncpg://{self.configuration.psql.user}:{self.configuration.psql.password}@{psql_host}/{self.configuration.psql.database}",
            json_serializer=lambda x: orjson.dumps(x).decode(),
            json_deserializer=orjson.loads,
            echo=self.configuration.logs.log_libs,
        )

        self.prom_client = PrometheusConnect(
            url=self.configuration.prometheus.url,
            disable_ssl=self.configuration.prometheus.disable_ssl,
        )

        self.sessionmaker = async_sessionmaker(self.engine)

        self.logger = setup_logging(
            log_level=getattr(logging, self.configuration.logs.level),
            env=self.configuration.env,
        )

        if not self.configuration.logs.log_libs:
            logging.getLogger("httpx").setLevel(logging.CRITICAL)

        # Set app singleton for blocks to access
        set_app(self)

    def log(self, name: str, **kwargs) -> BoundLogger:
        return self.logger.bind(name=name, **kwargs)

    @staticmethod
    def init_web() -> APIRouter:
        router = APIRouter()
        router.include_router(flows_router)
        router.include_router(labels_router)
        router.include_router(metrics_router)
        router.include_router(events_router)
        router.include_router(notebook_router)
        router.include_router(health_router)

        return router
