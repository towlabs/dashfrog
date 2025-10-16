from typing import Any, Iterable

from pydantic import BaseModel


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
