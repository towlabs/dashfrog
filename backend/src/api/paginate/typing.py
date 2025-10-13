from __future__ import annotations

from collections.abc import Sequence
import math
from typing import Annotated, Generic, TypeVar

from fastapi import Query
from pydantic import BaseModel, Field

from .bases import AbstractParams, BasePage, RawParams

T = TypeVar("T")


class Pagination(BaseModel, AbstractParams):
    page: int = Query(1, ge=1, description="Page number")
    nb_items: int = Query(50, ge=1, le=250, description="Number of items per page")

    def to_raw_params(self) -> RawParams:
        return RawParams(
            limit=self.nb_items,
            offset=self.nb_items * (self.page - 1),
        )


class Page(BasePage[T], Generic[T]):
    page: Annotated[int, Field(ge=1)]
    nb_items: Annotated[int, Field(ge=0)]

    __params_type__ = Pagination

    @classmethod
    def create(
        cls,
        items: Sequence[T],
        total: int,
        params: AbstractParams,
    ) -> Page[T]:
        if not isinstance(params, Pagination):
            raise ValueError("Page should be used with Params")

        return cls(
            total=total,
            items=items,
            page=params.page,
            nb_items=params.nb_items,
            total_pages=math.ceil(total / params.nb_items),
        )
