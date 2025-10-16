from dataclasses import dataclass, field
import logging

from axiom_py.client import Client
import clickhouse_connect
from clickhouse_connect.driver import Client as ClickhouseClient
from pydantic import BaseModel
from structlog.stdlib import BoundLogger

from src._inits import setup_logging
from src.adapters.stores import (
    Flows as FlowsStore,
    Steps as StepsStore,
)
from src.api.routes import API, flows, steps, labels, health
from src.context import ENV, RELEASE
from src.core import Config
from src.domain.usecases import Flows, Steps


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
    axiom_client: Client = field(init=False)
    logger: BoundLogger = field(init=False)

    def __post_init__(self):
        super().__post_init__()

        ENV.set(self.configuration.env)
        RELEASE.set(self.configuration.release)

        self.clickhouse_client = clickhouse_connect.get_client(
            host=self.configuration.click_house.host,
            user=self.configuration.click_house.user,
            password=self.configuration.click_house.password,
            autogenerate_session_id=False,
        )

        self.axiom_client = (
            Client() if self.configuration.logs.activate_axiom else None
        )  # Need a support for logs as we do not provide one yet
        self.logger = setup_logging(
            self.axiom_client,
            log_level=getattr(logging, self.configuration.logs.level),
            env=self.configuration.env,
            with_axiom=self.configuration.logs.activate_axiom,
        )

        if not self.configuration.logs.log_libs:
            logging.getLogger("httpx").setLevel(logging.CRITICAL)

        ## Deps
        flow_store = FlowsStore(self.clickhouse_client)
        step_store = StepsStore(self.clickhouse_client)

        self.usecases = {
            "flows": Flows(flow_store, self.logger),
            "steps": Steps(step_store, self.logger),
        }

    def log(self, name: str, **kwargs) -> BoundLogger:
        return self.logger.bind(name=name, **kwargs)

    def init_web(self):
        API(
            flows.Flows(self.usecases["flows"]),
            steps.Steps(self.usecases["steps"]),
            labels.Labels(self.usecases["flows"]),
            health,
        )
