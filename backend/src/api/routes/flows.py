from datetime import datetime

from fastapi import APIRouter, Depends, Request
from pydantic.main import BaseModel

from src.api.paginate.typing import Page, Pagination
from src.api.payloads import ResponsesDefinition
from src.core.context import context
from src.domain import usecases
from src.domain.entities import (
    Flow,
    StoreFilter,
    StoreOrder,
    StoreOrderClause,
)


class _FilterParams(BaseModel):
    class OderBy(BaseModel):
        key: str
        order: str = "asc"
        nulls_first: bool = False

    class Filter(BaseModel):
        key: str
        value: str
        op: str = "="
        is_label: bool = False

    order_by: list[OderBy] = []
    filters: list[Filter] = []
    service_name: str = ""
    status: str = ""

    from_date: datetime | None = None
    to_date: datetime | None = None

    def get_orders(self) -> StoreOrder:
        orders = []
        for order in self.order_by:
            orders.append(
                StoreOrderClause(
                    key=order.key, order=order.order, nulls_first=order.nulls_first
                )
            )

        return StoreOrder(orders)

    def get_filters(self, *, with_times: bool = False) -> list[StoreFilter]:
        filters = []

        if self.service_name:
            filters.append(
                StoreFilter(key="service_name", value=self.service_name, op="=")
            )

        if self.status:
            filters.append(StoreFilter(key="status", value=self.status, op="="))

        if with_times:
            if self.from_date:
                filters.append(
                    StoreFilter(
                        key="from_created_at",
                        value=self.from_date,
                        op=">=",
                        field_name="created_at",
                    )
                )
            if self.to_date:
                filters.append(
                    StoreFilter(
                        key="to_created_at",
                        value=self.to_date,
                        op="<=",
                        field_name="created_at",
                    )
                )

        for filt in self.filters:
            if filt.is_label:
                filters.append(
                    StoreFilter(
                        key=f"labels['{filt.key}']", value=filt.value, op=filt.op
                    )
                )
            else:
                filters.append(StoreFilter(key=filt.key, value=filt.value, op=filt.op))

        return filters


class Flows:
    __uc = usecases.Flows

    ep = APIRouter(prefix="/flows", tags=["flows"])

    def __init__(self, uc: usecases.Flows):
        Flows.__uc = uc

    @staticmethod
    @ep.get(
        "/",
        response_model=list[Flow],
        responses=ResponsesDefinition().build(),
    )
    @ep.post("/", response_model=list[Flow], responses=ResponsesDefinition().build())
    def list_flows(
        request: Request,
        from_date: str | None = None,
        to_date: str | None = None,
        filters: _FilterParams = _FilterParams(),
    ):
        with context(request) as ctx:
            from_date_ts = datetime.fromisoformat(from_date) if from_date else None
            to_date_ts = datetime.fromisoformat(to_date) if to_date else None

            flows = Flows.__uc.list_flows(
                ctx,
                filters.from_date or from_date_ts,
                filters.to_date or to_date_ts,
                order_by=filters.get_orders(),
                filters=filters.get_filters(),
            )

            return flows

    @staticmethod
    @ep.get(
        "/latest",
        response_model=list[Flow],
        responses=ResponsesDefinition().build(),
    )
    @ep.post(
        "/latest",
        response_model=list[Flow],
        responses=ResponsesDefinition().build(),
    )
    def latest_flows(
        request: Request,
        from_date: str | None = None,
        to_date: str | None = None,
        filters: _FilterParams = _FilterParams(),
    ):
        with context(request) as ctx:
            from_date_ts = datetime.fromisoformat(from_date) if from_date else None
            to_date_ts = datetime.fromisoformat(to_date) if to_date else None

            flows = Flows.__uc.get_latest_flow_runs(
                ctx,
                from_date_ts,
                to_date_ts,
                filters=filters.get_filters(),
            )

            return flows

    @staticmethod
    @ep.get(
        "/{name}",
        response_model=Page[Flow],
        responses=ResponsesDefinition().build(),
    )
    @ep.post(
        "/{name}",
        response_model=Page[Flow],
        responses=ResponsesDefinition().build(),
    )
    def history(
        request: Request,
        name: str,
        filters: _FilterParams = _FilterParams(),
        paginate: Pagination = Depends(),
    ):
        with context(request) as ctx:
            raw_pagination = paginate.to_raw_params()

            flows, qty = Flows.__uc.get_single_history(
                ctx,
                name,
                raw_pagination.limit,
                raw_pagination.offset,
                filters.get_filters(with_times=True),
                filters.get_orders(),
            )

            return Page[Flow].create(flows, qty, paginate)

    @staticmethod
    @ep.get(
        "/{name}/{trace_id}",
        response_model=Flow,
        responses=ResponsesDefinition().build(),
    )
    def detail(request: Request, name: str, trace_id: str):
        with context(request) as ctx:
            flow = Flows.__uc.get(ctx, name, trace_id)

            return flow
