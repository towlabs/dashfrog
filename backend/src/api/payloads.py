from __future__ import annotations

from http import HTTPStatus
from typing import Any

from pydantic import BaseModel


class Errors:
    class Base(BaseModel):
        error: str

    class NotFound(Base):
        key: str

    class InvalidData(Base):
        key: str
        details: list[Any]


class ResponsesDefinition:
    """Build response documentation"""

    def __init__(self) -> None:
        self.__errors: dict[int | str, dict[str, Any]] = {
            int(HTTPStatus.INTERNAL_SERVER_ERROR): {"model": Errors.Base},
            int(HTTPStatus.UNAUTHORIZED): {"model": Errors.Base},
        }

    @staticmethod
    def open_endpoints() -> ResponsesDefinition:
        """Initialize a new response definition for open endpoints"""
        res = ResponsesDefinition()

        res.__errors = {int(HTTPStatus.INTERNAL_SERVER_ERROR): {"model": Errors.Base}}

        return res

    def with_not_found(self) -> ResponsesDefinition:
        """Add not found documentation"""
        self.__errors[int(HTTPStatus.NOT_FOUND)] = {"model": Errors.NotFound}
        return self

    def with_data_validations(self) -> ResponsesDefinition:
        """Add validation error documentation"""
        self.__errors[int(HTTPStatus.BAD_REQUEST)] = {"model": Errors.InvalidData}
        return self

    def with_rate_limiting(self) -> ResponsesDefinition:
        self.__errors[int(HTTPStatus.TOO_MANY_REQUESTS)] = {"model": Errors.Base}
        return self

    def build(self) -> dict[int | str, dict[str, Any]]:
        return self.__errors
