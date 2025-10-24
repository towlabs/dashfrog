from __future__ import annotations

from datetime import datetime
from http import HTTPStatus
from typing import Any

from pydantic import BaseModel

from core.stores import StoreFilter, StoreOrder, StoreOrderClause


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


class FilterParams(BaseModel):
    """
    Unified filtering parameters for API endpoints.

    Supports common filtering patterns across different endpoints:
    - Custom filters with various operators
    - Date range filtering
    - Label-based filtering
    - Ordering/sorting
    - Entity-specific filters (status, service_name, kind, etc.)
    """

    class Filter(BaseModel):
        key: str
        value: str
        op: str = "="
        is_label: bool = False

    class OrderBy(BaseModel):
        key: str
        order: str = "asc"
        nulls_first: bool = False

    # Common filters
    filters: list[Filter] = []
    order_by: list[OrderBy] = []

    # Date range filters
    from_date: datetime | None = None
    to_date: datetime | None = None

    # Entity-specific filters (optional, used by specific endpoints)
    kind: str = ""
    status: str = ""
    service_name: str = ""

    def get_orders(self) -> StoreOrder:
        """Convert API order parameters to StoreOrder."""
        orders = []
        for order in self.order_by:
            orders.append(StoreOrderClause(key=order.key, order=order.order, nulls_first=order.nulls_first))
        return StoreOrder(orders)

    def get_filters(self, *, with_times: bool = False, date_field: str = "created_at") -> list[StoreFilter]:
        """
        Convert API filter parameters to list of StoreFilter objects.

        Args:
            with_times: Whether to include date range filters
            date_field: The field name to use for date filtering (default: created_at)
        """
        filters = []

        # Add entity-specific filters if specified
        if self.kind:
            filters.append(StoreFilter(key="kind", value=self.kind, op="="))

        if self.status:
            filters.append(StoreFilter(key="status", value=self.status, op="="))

        if self.service_name:
            filters.append(StoreFilter(key="service_name", value=self.service_name, op="="))

        # Add date filters if requested and specified
        if with_times:
            if self.from_date:
                filters.append(
                    StoreFilter(
                        key=f"from_{date_field}",
                        value=self.from_date,
                        op=">=",
                        field_name=date_field,
                    )
                )
            if self.to_date:
                filters.append(
                    StoreFilter(
                        key=f"to_{date_field}",
                        value=self.to_date,
                        op="<=",
                        field_name=date_field,
                    )
                )

        # Add custom filters (including label filters)
        for filt in self.filters:
            if filt.is_label:
                # Format for PostgreSQL JSON filtering
                filters.append(StoreFilter(key=f"labels['{filt.key}']", value=filt.value, op=filt.op))
            else:
                filters.append(StoreFilter(key=filt.key, value=filt.value, op=filt.op))

        return filters
