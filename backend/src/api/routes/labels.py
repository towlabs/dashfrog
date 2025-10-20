from fastapi import APIRouter, Request
from pydantic import BaseModel

from src.core.context import context
from src.domain import usecases


class _LabelUpdate(BaseModel):
    description: str


class _LabelValueUpdate(BaseModel):
    proxy: str


class Labels:
    __uc = usecases.Labels

    ep = APIRouter(prefix="/labels", tags=["flows", "labels", "metrics"])

    def __init__(self, uc: usecases.Labels):
        Labels.__uc = uc

    @staticmethod
    @ep.get("/")
    async def get_labels(request: Request):
        with context(request) as ctx:
            labels = await Labels.__uc.list(ctx)

            return labels

    @staticmethod
    @ep.get("/scrape")
    async def scrape_labels(request: Request):
        with context(request) as ctx:
            await Labels.__uc.scrape_labels(ctx)

    @staticmethod
    @ep.put("/{label_id}")
    async def update_label(request: Request, label_id: int, body: _LabelUpdate):
        with context(request) as ctx:
            updated = await Labels.__uc.update(ctx, label_id, body.description)

            return updated

    @staticmethod
    @ep.put("/{label_id}/value/{value_name}")
    async def update_label_value(
        request: Request, label_id: int, value_name: str, body: _LabelValueUpdate
    ):
        with context(request) as ctx:
            updated = await Labels.__uc.update_value(
                ctx, label_id, value_name, body.proxy
            )

            return updated
