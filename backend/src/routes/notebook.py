"""Notebook routes."""

from typing import Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select

from core.context import get_app
from models import AbsoluteTimeWindow, BlockNote, Notebook, RelativeTimeWindow


def to_camel(string: str) -> str:
    """Convert snake_case to camelCase."""
    components = string.split("_")
    return components[0] + "".join(x.title() for x in components[1:])


class NotebookCreate(BaseModel):
    """Request model for creating a notebook."""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    uuid: str
    title: str
    description: str | None = None
    blocknote_uuid: str
    time_window: RelativeTimeWindow | AbsoluteTimeWindow


class BlockNoteUpdate(BaseModel):
    """Request model for updating a blocknote."""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    content: list[dict] | None = None


class BlockNoteResponse(BaseModel):
    """API response for a blocknote."""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    uuid: str
    content: list[dict]


class NotebookUpdate(BaseModel):
    """Request model for updating a notebook (partial)."""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    title: str | None = None
    description: str | None = None
    locked: bool | None = None
    time_window: RelativeTimeWindow | AbsoluteTimeWindow | None = None
    blocknote: BlockNoteUpdate | None = None


class NotebookResponse(BaseModel):
    """API response for a notebook."""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    uuid: str
    title: str
    description: str | None = None
    locked: bool = False
    blocknote_uuid: str
    blocknote: BlockNoteResponse | None = None
    time_window: RelativeTimeWindow | AbsoluteTimeWindow


router = APIRouter(prefix="/notebooks", tags=["notebooks"])


@router.get("/")
async def get_notebooks() -> list[NotebookResponse]:
    """Get all notebooks."""
    log = get_app().log("notebooks").bind(action="list")

    async with get_app().sessionmaker.begin() as session:
        query = select(Notebook).order_by(Notebook.created_at.desc())
        result = await session.execute(query)
        notebooks = result.scalars().all()

        log.debug("Success!", count=len(notebooks))

        return [
            NotebookResponse(
                uuid=notebook.uuid,
                title=notebook.title,
                description=notebook.description,
                locked=notebook.locked,
                blocknote_uuid=notebook.blocknote_uuid,
                time_window=notebook.time_window,
            )
            for notebook in notebooks
        ]


@router.get("/{uuid}")
async def get_notebook(uuid: str) -> NotebookResponse:
    """Get a notebook by UUID."""
    log = get_app().log("notebooks").bind(action="get", uuid=uuid)

    async with get_app().sessionmaker.begin() as session:
        query = select(Notebook).where(Notebook.uuid == uuid)
        result = await session.execute(query)
        notebook = result.scalar_one_or_none()

        if notebook is None:
            log.debug("Notebook not found")
            raise HTTPException(status_code=404, detail=f"Notebook with uuid {uuid} not found")

        log.debug("Success!")

        return NotebookResponse(
            uuid=notebook.uuid,
            title=notebook.title,
            description=notebook.description,
            locked=notebook.locked,
            blocknote_uuid=notebook.blocknote_uuid,
            blocknote=BlockNoteResponse(
                uuid=notebook.blocknote.uuid,
                content=notebook.blocknote.content,
            ),
            time_window=notebook.time_window,
        )


@router.put("/{uuid}")
async def update_notebook(uuid: str, body: NotebookUpdate) -> NotebookResponse:
    """Update a notebook by UUID (partial update)."""
    log = get_app().log("notebooks").bind(action="update", uuid=uuid)

    async with get_app().sessionmaker.begin() as session:
        # Fetch the notebook
        query = select(Notebook).where(Notebook.uuid == uuid)
        result = await session.execute(query)
        notebook = result.scalar_one_or_none()

        if notebook is None:
            log.debug("Notebook not found")
            raise HTTPException(status_code=404, detail=f"Notebook with uuid {uuid} not found")

        # Update notebook fields if provided
        if body.title is not None:
            notebook.title = body.title
        if body.description is not None:
            notebook.description = body.description
        if body.locked is not None:
            notebook.locked = body.locked
        if body.time_window is not None:
            notebook.time_window = body.time_window

        # Update blocknote content if provided
        if body.blocknote is not None and body.blocknote.content is not None:
            notebook.blocknote.content = body.blocknote.content

        await session.flush()

        log.debug("Success!")

        return NotebookResponse(
            uuid=notebook.uuid,
            title=notebook.title,
            description=notebook.description,
            locked=notebook.locked,
            blocknote_uuid=notebook.blocknote_uuid,
            blocknote=BlockNoteResponse(
                uuid=notebook.blocknote.uuid,
                content=notebook.blocknote.content,
            ),
            time_window=notebook.time_window,
        )


@router.post("/")
async def create_notebook(body: NotebookCreate):
    """Create a new notebook."""
    log = (
        get_app()
        .log("notebooks")
        .bind(
            action="create",
            uuid=body.uuid,
            title=body.title,
        )
    )

    try:
        async with get_app().sessionmaker.begin() as session:
            # Create the BlockNote first
            blocknote = BlockNote(
                uuid=body.blocknote_uuid,
                content=[],
            )
            session.add(blocknote)

            # Create the Notebook
            notebook = Notebook(
                uuid=body.uuid,
                title=body.title,
                description=body.description,
                blocknote_uuid=body.blocknote_uuid,
                time_window=body.time_window,
            )
            session.add(notebook)

            await session.flush()

            log.debug("Success!", notebook_uuid=notebook.uuid)

    except Exception as e:
        log.error("Failed to create notebook", error=str(e))
        raise
