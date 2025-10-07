from datetime import datetime
from typing import Any, Iterable

from pydantic import BaseModel


class Flow(BaseModel):
    name: str
    description: str | None = None
    labels: dict[str, str]
    global_state: str  # For wrapped flows
    status: str
    status_reason: str | None = None
    timestamp: datetime
    trace_id: str
    span_id: str
    parent_id: str | None = None
    service_name: str


class Event(BaseModel):
    name: str
    description: str | None = None
    labels: dict[str, str]
    timestamp: datetime


class StoreFilter(BaseModel):
    key: str
    value: Any

    op: str = "="
    withPart: str | None = None
    valueIsCol: bool = False


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
