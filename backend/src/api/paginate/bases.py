from abc import ABC, abstractmethod
from collections.abc import Sequence
from dataclasses import dataclass
from typing import Annotated, ClassVar, Generic, TypeVar

from pydantic import BaseModel, Field

T = TypeVar("T")
C = TypeVar("C")

TAbstractPage = TypeVar("TAbstractPage", bound="AbstractPage")


@dataclass
class RawParams:
    limit: int
    offset: int


class AbstractParams(ABC):
    @abstractmethod
    def to_raw_params(self) -> RawParams:
        pass


class AbstractPage(BaseModel, Generic[T], ABC):
    __params_type__: ClassVar[type[AbstractParams]]

    @classmethod
    @abstractmethod
    def create(
        cls: type[C], items: Sequence[T], total: int, params: AbstractParams
    ) -> C:
        pass

    class Config:
        arbitrary_types_allowed = True


class BasePage(AbstractPage[T], Generic[T], ABC):
    items: Sequence[T]
    total: Annotated[int, Field(ge=0)]
    total_pages: Annotated[int, Field(ge=0)]


__all__ = [
    "AbstractPage",
    "AbstractParams",
    "BasePage",
    "RawParams",
]
