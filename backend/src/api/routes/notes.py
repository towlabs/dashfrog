from http import HTTPStatus

from fastapi import APIRouter
from pydantic import BaseModel, Field
from starlette.responses import JSONResponse

from notebooks import (
    Block as BlockEntity,
    Notebooks,
    NoteLockedException,
)


class _BlockAPI(BaseModel):
    """Block representation for API - uses 'type' for NotebookJS compatibility."""

    id: str
    type: str = Field(description="Block type (maps to 'kind' internally)")
    content: dict
    position: int

    @classmethod
    def from_entity(cls, block: BlockEntity) -> "_BlockAPI":
        """Convert internal Block entity to API representation."""
        return cls(
            id=block.id,
            type=block.kind,  # kind -> type
            content=block.content,
            position=block.position,
        )

    def to_entity(self) -> BlockEntity:
        """Convert API representation to internal Block entity."""
        return BlockEntity(
            id=self.id,
            kind=self.type,  # type -> kind
            content=self.content,
            position=self.position,
        )


class _NoteAPI(BaseModel):
    """Note representation for API."""

    id: int
    title: str
    description: str | None = None
    locked: bool = False
    blocks: list[_BlockAPI] = []


class _NoteCreate(BaseModel):
    title: str
    description: str | None = None
    blocks: list[_BlockAPI] = []


class _NoteUpdate(BaseModel):
    title: str | None = None
    description: str | None = None


class _BlockCreate(BaseModel):
    id: str
    type: str
    content: dict = {}
    position: int


class _BlockUpdate(BaseModel):
    type: str | None = None
    content: dict | None = None
    position: int | None = None


class _BlockBatchUpdateItem(BaseModel):
    id: str
    type: str | None = None
    content: dict | None = None
    position: int | None = None


class _BlockBatchUpdate(BaseModel):
    blocks: list[_BlockBatchUpdateItem]


ep = APIRouter(prefix="/notes", tags=["notes"])


def _handle_locked_error(e: NoteLockedException):
    """Helper method to handle NoteLockedException consistently."""
    return JSONResponse(
        status_code=HTTPStatus.LOCKED,
        content={"detail": f"Note {e.note_id} is locked and cannot be modified"},
    )

@ep.get("/")
async def list_notes() -> list[_NoteAPI]:
    notes = await Notebooks().list()

    # Convert entities to API representation
    return [
        _NoteAPI(
            id=note.id,
            title=note.title,
            description=note.description,
            locked=note.locked,
            blocks=[_BlockAPI.from_entity(block) for block in note.blocks],
        )
        for note in notes
    ]


@ep.get("/{note_id}")
async def get_note(note_id: int) -> _NoteAPI:
    note = await Notebooks().get(note_id)

    return _NoteAPI(
        id=note.id,
        title=note.title,
        description=note.description,
        locked=note.locked,
        blocks=[_BlockAPI.from_entity(block) for block in note.blocks],
    )


@ep.post("/")
async def create_note(body: _NoteCreate) -> _NoteAPI:
    # Convert API blocks to entities
    blocks = [block.to_entity() for block in body.blocks] if body.blocks else None

    note = await Notebooks().create(body.title, body.description, blocks)

    return _NoteAPI(
        id=note.id,
        title=note.title,
        description=note.description,
        locked=note.locked,
        blocks=[_BlockAPI.from_entity(block) for block in note.blocks],
    )


@ep.put("/{note_id}")
async def update_note(note_id: int, body: _NoteUpdate):
    try:
        note = await Notebooks().update(note_id, title=body.title, description=body.description)

        return _NoteAPI(
            id=note.id,
            title=note.title,
            description=note.description,
            locked=note.locked,
            blocks=[_BlockAPI.from_entity(block) for block in note.blocks],
        )
    except NoteLockedException as e:
        return _handle_locked_error(e)


@ep.delete("/{note_id}")
async def delete_note(note_id: int):
    await Notebooks().delete(note_id)
    return {"status": "deleted"}


@ep.post("/{note_id}/lock")
async def lock_note(note_id: int) -> _NoteAPI:
    """Lock a note to prevent modifications."""
    note = await Notebooks().lock(note_id)

    return _NoteAPI(
        id=note.id,
        title=note.title,
        description=note.description,
        locked=note.locked,
        blocks=[_BlockAPI.from_entity(block) for block in note.blocks],
    )


@ep.post("/{note_id}/unlock")
async def unlock_note(note_id: int) -> _NoteAPI:
    """Unlock a note to allow modifications."""
    note = await Notebooks().unlock(note_id)

    return _NoteAPI(
        id=note.id,
        title=note.title,
        description=note.description,
        locked=note.locked,
        blocks=[_BlockAPI.from_entity(block) for block in note.blocks],
    )


@ep.get("/{note_id}/blocks")
async def list_blocks(note_id: int) -> list[_BlockAPI]:
    blocks = await Notebooks().list_blocks(note_id)
    return [_BlockAPI.from_entity(block) for block in blocks]


@ep.put("/{note_id}/blocks/batch")
async def batch_upsert_blocks(note_id: int, body: _BlockBatchUpdate):
    """Batch upsert blocks - updates existing blocks or creates new ones."""
    try:
        # Convert API blocks to update tuples (id, kind, content, position)
        updates = [
            (
                block.id,
                block.type,  # type -> kind conversion happens in usecase
                block.content,
                block.position,
            )
            for block in body.blocks
        ]

        upserted_blocks = await Notebooks().batch_upsert_blocks(note_id, updates)
        return [_BlockAPI.from_entity(block) for block in upserted_blocks]
    except NoteLockedException as e:
        return _handle_locked_error(e)


@ep.post("/{note_id}/blocks")
async def create_block(note_id: int, body: _BlockCreate):
    try:
        # Convert API representation to entity (type -> kind)
        block_entity = BlockEntity(
            id=body.id,
            kind=body.type,
            content=body.content,
            position=body.position,
        )

        block = await Notebooks().create_block(note_id, block_entity)
        return _BlockAPI.from_entity(block)
    except NoteLockedException as e:
        return _handle_locked_error(e)


@ep.put("/{note_id}/blocks/{block_id}")
async def update_block(note_id: int, block_id: str, body: _BlockUpdate):
    try:
        block = await Notebooks().update_block(
            block_id,
            kind=body.type if body.type is not None else None,
            content=body.content,
            position=body.position,
        )

        return _BlockAPI.from_entity(block)
    except NoteLockedException as e:
        return _handle_locked_error(e)


@ep.delete("/{note_id}/blocks/{block_id}")
async def delete_block(note_id: int, block_id: str):
    try:
        await Notebooks().delete_block(block_id)
        return {"status": "deleted"}
    except NoteLockedException as e:
        return _handle_locked_error(e)
