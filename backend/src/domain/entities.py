from datetime import datetime
from typing import Any, Iterable

from pydantic import BaseModel


class Flow(BaseModel):
    trace_id: str
    name: str
    description: str | None = None
    labels: dict[str, str]
    status: str | None = None
    status_reason: str | None = None
    duration: int | None = None
    service_name: str | None = None
    created_at: datetime | None = None
    ended_at: datetime | None = None


class Step(BaseModel):
    id: str
    for_flow: str
    trace_id: str
    name: str | None = None
    description: str | None = None
    labels: dict[str, str]
    status: str | None = None
    parent_id: str | None = None
    duration: int | None = None
    status_message: str | None = None
    created_at: datetime | None = None
    started_at: datetime | None = None
    ended_at: datetime | None = None

    children: list["Step"] = []


class Event(BaseModel):
    name: str
    description: str | None = None
    labels: dict[str, str]
    timestamp: datetime


class StoreOrderClause(BaseModel):
    key: str
    order: str = "asc"
    nulls_first: bool = False


class StoreOrder(list[StoreOrderClause]):
    def to_sql(self) -> str:
        if len(self) == 0:
            return ""

        return "\nORDER BY " + (
            ", ".join(f"{clause.key} {clause.order}{' NULLS FIRST' if clause.nulls_first else ''}" for clause in self)
        )


class StoreFilter(BaseModel):
    key: str
    value: Any

    op: str = "="
    type_mapper: str = "s"
    withPart: str | None = None
    valueIsCol: bool = False
    field_name: str | None = None


def StoreMapEqual(key: str, field_name: str, value: Any) -> StoreFilter:
    return StoreFilter(key=key, value=value, field_name=field_name, op="mapFilter")


def StoreEqual(key: str, value: Any, **kwargs) -> StoreFilter:
    if "op" in kwargs:
        del kwargs["op"]

    return StoreFilter(key=key, value=value, **kwargs)


def StoreNotEqual(key: str, value: Any, **kwargs) -> StoreFilter:
    if "op" in kwargs:
        del kwargs["op"]

    return StoreFilter(key=key, value=value, op="!=", **kwargs)


def StoreGreater(key: str, value: Any, **kwargs) -> StoreFilter:
    if "op" in kwargs:
        del kwargs["op"]

    return StoreFilter(key=key, value=value, op=">=", **kwargs)


def StoreLower(key: str, value: Any, **kwargs) -> StoreFilter:
    if "op" in kwargs:
        del kwargs["op"]

    return StoreFilter(key=key, value=value, op="<=", **kwargs)


def StoreIn(key: str, value: Iterable[Any], **kwargs) -> StoreFilter:
    if "op" in kwargs:
        del kwargs["op"]

    return StoreFilter(key=key, value=value, op="in", **kwargs)
