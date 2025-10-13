from fastapi import APIRouter, Request

from api.payloads import ResponsesDefinition
from domain import usecases
from domain.entities import Step
from src.context import context


class Steps:
    __uc = usecases.Steps

    ep = APIRouter(prefix="/flows/{name}/{trace_id}/steps", tags=["flows", "steps"])

    def __init__(self, uc: usecases.Steps):
        Steps.__uc = uc

    @staticmethod
    @ep.get(
        "/",
        response_model=list[Step],
        responses=ResponsesDefinition().build(),
    )
    def list_steps(request: Request, name: str, trace_id: str):
        with context(request) as ctx:
            steps = Steps.__uc.get(ctx, name, trace_id)

            return steps
