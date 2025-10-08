from abc import ABC, abstractmethod

from . import entities
from .core import get_clickhouse


class NotFound(Exception):
    pass


class AbstractStore(ABC):
    @staticmethod
    @abstractmethod
    def insert(entity: entities.Base):
        raise NotImplementedError()


class Flows(AbstractStore):
    @staticmethod
    def insert(entity: entities.Base):
        get_clickhouse().insert(
            "dashfrog.flow_events",
            [list(entity.model_dump(exclude_none=True, exclude_defaults=False, exclude_unset=False).values())],
            column_names=list(entity.model_dump(exclude_none=True, exclude_defaults=False, exclude_unset=False).keys()),
        )


class Steps(AbstractStore):
    @staticmethod
    def insert(entity: entities.Base):
        get_clickhouse().insert(
            "dashfrog.step_events",
            [list(entity.model_dump(exclude_none=True, exclude_defaults=False, exclude_unset=False).values())],
            column_names=list(entity.model_dump(exclude_none=True, exclude_defaults=False, exclude_unset=False).keys()),
        )
