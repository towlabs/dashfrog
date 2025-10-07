from datetime import datetime

from fastapi import APIRouter, Request

from domain import usecases
from src.context import context


class Flows:
    __uc = usecases.Flows

    ep = APIRouter(prefix="/flows", tags=["flows"])

    def __init__(self, uc: usecases.Flows):
        Flows.__uc = uc

    @staticmethod
    @ep.get("/")
    def list_flows(
        request: Request, from_date: str | None = None, to_date: str | None = None
    ):
        with context(request) as ctx:
            from_date_ts = datetime.fromisoformat(from_date) if from_date else None
            to_date_ts = datetime.fromisoformat(to_date) if to_date else None

            flows = Flows.__uc.list_flows(ctx, from_date_ts, to_date_ts)

            return flows
