from fastapi import APIRouter, Request

from src.context import context

loc_router = APIRouter("/ingest")

@loc_router.get("/")
async def ingest(request: Request, data: dict | list):
    with context(request=request):
        print(data)
        return {"data": data}