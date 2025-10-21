from dataclasses import dataclass, field
import logging

import clickhouse_connect
from clickhouse_connect.driver.client import Client as ClickhouseClient
import orjson
from prometheus_api_client import PrometheusConnect
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from structlog._generic import BoundLogger

from src._inits import setup_logging
from src.adapters.stores import (
    Flows as FlowsStore,
    Labels as LabelsStore,
    Metrics as MetricsStore,
    Steps as StepsStore,
)
from src.api.routes import API, flows, health, labels, metrics, steps
from src.core import AsyncSessionMaker, Config
from src.core.context import ENV, RELEASE
from src.domain.usecases import Flows, Labels, Metrics, Steps


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

        ENV.set(self.configuration.env)
        RELEASE.set(self.configuration.release)

        self.clickhouse_client = clickhouse_connect.get_client(
            host=self.configuration.click_house.host,
            port=self.configuration.click_house.port or 8123,
            user=self.configuration.click_house.user,
            password=self.configuration.click_house.password,
            database=self.configuration.click_house.database,
            autogenerate_session_id=False,
        )

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

        self.sessionmaker = AsyncSessionMaker(async_sessionmaker(self.engine))

        self.logger = setup_logging(
            log_level=getattr(logging, self.configuration.logs.level),
            env=self.configuration.env,
        )

        if not self.configuration.logs.log_libs:
            logging.getLogger("httpx").setLevel(logging.CRITICAL)

        ## Deps
        flow_store = FlowsStore(self.clickhouse_client)
        step_store = StepsStore(self.clickhouse_client)
        label_store = LabelsStore(self.clickhouse_client, self.prom_client, self.logger)
        metrics_store = MetricsStore(self.clickhouse_client, self.prom_client, self.logger)

        self.usecases = {
            "flows": Flows(flow_store, self.logger),
            "steps": Steps(step_store, self.logger),
            "labels": Labels(label_store, metrics_store, self.sessionmaker, self.logger),
            "metrics": Metrics(metrics_store, self.sessionmaker, self.prom_client, self.logger),
        }

    def log(self, name: str, **kwargs) -> BoundLogger:
        return self.logger.bind(name=name, **kwargs)

    def init_web(self):
        API(
            flows.Flows(self.usecases["flows"]),
            steps.Steps(self.usecases["steps"]),
            labels.Labels(self.usecases["labels"]),
            metrics.Metrics(self.usecases["metrics"]),
            health,
        )
