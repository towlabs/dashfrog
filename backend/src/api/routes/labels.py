from fastapi import APIRouter, Request

from src.context import context
from src.domain import usecases


class Labels:
    __uc = usecases.Flows

    ep = APIRouter(prefix="/labels", tags=["flows", "labels"])

    def __init__(self, uc: usecases.Flows):
        Labels.__uc = uc

    @staticmethod
    @ep.get("/")
    def get_labels(request: Request):
        with context(request) as ctx:
            labels = Labels.__uc.get_labels(ctx)

            return labels
