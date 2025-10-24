from datetime import datetime

from fastapi import APIRouter
from pydantic.main import BaseModel

from facets import Facets


class _Query(BaseModel):
    query: str
    from_date: datetime
    to_date: datetime
    steps: str | None = None


ep = APIRouter(prefix="/metrics", tags=["metrics"])


@ep.get("/")
async def list():
    return await Facets().list_metrics()


@ep.get("/scrape")
async def scrape():
    await Facets().scrape_metrics()


@ep.post("/query")
def query_metric(body: _Query):
    return Facets().query_metrics(
        body.query, body.from_date, body.to_date, body.steps
    )
