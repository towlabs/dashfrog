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

    @staticmethod
    @abstractmethod
    def get_by_id(identifier: str, trace_id: str, *fields: str):
        raise NotImplementedError()


class Flows(AbstractStore):
    @staticmethod
    def insert(entity: entities.Base):
        get_clickhouse().insert(
            "dashfrog.flow_events",
            [list(entity.model_dump(exclude_none=True, exclude_defaults=False, exclude_unset=False).values())],
            column_names=list(entity.model_dump(exclude_none=True, exclude_defaults=False, exclude_unset=False).keys()),
        )

    @staticmethod
    def get_by_id(identifier: str, trace_id: str, *fields: str):
        _fields = " name, trace_id"

        for field in fields:
            match field:
                case "created_at" | "started_at":
                    _fields += f", max({field}) as {field}"
                case "ended_at":
                    _fields += f", min({field}) as {field}"
                case _:
                    _fields += f", any({field}) as {field}"

        res = get_clickhouse().query(
            f"""
        SELECT
            {_fields}
        FROM dashfrog.flow_events
        WHERE trace_id = %(trace_id)s AND name = %(identifier)s
        GROUP BY name, trace_id
        LIMIT 1
        """,
            parameters={"identifier": identifier, "trace_id": trace_id},
        )

        for row in res.named_results():
            return entities.Flow(**row)

        raise NotFound("Flow")


class Steps(AbstractStore):
    @staticmethod
    def insert(entity: entities.Base):
        get_clickhouse().insert(
            "dashfrog.step_events",
            [list(entity.model_dump(exclude_none=True, exclude_defaults=False, exclude_unset=False).values())],
            column_names=list(entity.model_dump(exclude_none=True, exclude_defaults=False, exclude_unset=False).keys()),
        )

    @staticmethod
    def get_by_id(identifier: str, trace_id: str, *fields: str):
        _fields = " id, trace_id, for_flow"

        for field in fields:
            match field:
                case "created_at" | "started_at":
                    _fields += f", max({field}) as {field}"
                case "ended_at":
                    _fields += f", min({field}) as {field}"
                case _:
                    _fields += f", any({field}) as {field}"

        res = get_clickhouse().query(
            f"""
        SELECT
            {_fields}
        FROM dashfrog.step_events
        WHERE trace_id = %(trace_id)s AND id = %(identifier)s
        GROUP BY id, trace_id, for_flow
        LIMIT 1
        """,
            parameters={"identifier": identifier, "trace_id": trace_id},
        )

        for row in res.named_results():
            return entities.Step(**row)

        raise NotFound("Step")
