from fastapi import APIRouter, Request

from src.core.context import context
from src.domain import usecases


class Metrics:
    __uc = usecases.Metrics

    ep = APIRouter(prefix="/metrics", tags=["metrics"])

    def __init__(self, uc: usecases.Metrics):
        Metrics.__uc = uc

    @staticmethod
    @ep.get("/scrape")
    async def scrape(request: Request):
        with context(request) as ctx:
            await Metrics.__uc.scrape(ctx)
