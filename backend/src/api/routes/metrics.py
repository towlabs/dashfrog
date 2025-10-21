from datetime import datetime

from fastapi import APIRouter, Request
from pydantic.main import BaseModel

from src.core.context import context
from src.domain import usecases


class _Query(BaseModel):
    query: str
    from_date: datetime
    to_date: datetime


class Metrics:
    __uc: usecases.Metrics

    ep = APIRouter(prefix="/metrics", tags=["metrics"])

    def __init__(self, uc: usecases.Metrics):
        Metrics.__uc = uc

    @staticmethod
    @ep.get("/")
    async def list(request: Request):
        with context(request) as ctx:
            return await Metrics.__uc.list(ctx)

    @staticmethod
    @ep.get("/scrape")
    async def scrape(request: Request):
        with context(request) as ctx:
            await Metrics.__uc.scrape(ctx)

    @staticmethod
    @ep.post("/query")
    def query_metric(request: Request, body: _Query):
        with context(request) as ctx:
            Metrics.__uc.query(ctx, body.query, body.from_date, body.to_date)
