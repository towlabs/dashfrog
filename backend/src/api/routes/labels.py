from fastapi import APIRouter
from pydantic import BaseModel

from facets import Facets


class _LabelUpdate(BaseModel):
    description: str | None = None
    hide: bool | None = None
    display_as: str | None = None


class _LabelValueUpdate(BaseModel):
    proxy: str


ep = APIRouter(prefix="/labels", tags=["flows", "labels", "metrics"])


@ep.get("/")
async def get_labels(with_hidden: bool = False):
    return await Facets().list_labels(with_hidden)


@ep.get("/scrape")
async def scrape_labels():
    await Facets().scrape_labels()


@ep.put("/{label_id}")
async def update_label(label_id: int, body: _LabelUpdate):
    return await Facets().update_label(label_id, body.description, body.hide, body.display_as)


@ep.put("/{label_id}/value/{value_name}")
async def update_label_value(label_id: int, value_name: str, body: _LabelValueUpdate):
    return await Facets().update_label_value(label_id, value_name, body.proxy)
