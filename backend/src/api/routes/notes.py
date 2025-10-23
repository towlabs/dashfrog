from http import HTTPStatus

from fastapi import APIRouter, Request
from pydantic import BaseModel, Field
from starlette.responses import JSONResponse

from src.core.context import context
from src.domain import usecases
from src.domain.entities import Block as BlockEntity
from src.domain.usecases.notes import NoteLockedException


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


class Notes:
    __uc: usecases.Notes

    ep = APIRouter(prefix="/notes", tags=["notes"])

    def __init__(self, uc: usecases.Notes):
        Notes.__uc = uc

    @staticmethod
    def _handle_locked_error(e: NoteLockedException):
        """Helper method to handle NoteLockedException consistently."""
        return JSONResponse(
            status_code=HTTPStatus.LOCKED,
            content={"detail": f"Note {e.note_id} is locked and cannot be modified"},
        )

    @staticmethod
    @ep.get("/")
    async def list_notes(request: Request) -> list[_NoteAPI]:
        with context(request) as ctx:
            notes = await Notes.__uc.list(ctx)

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

    @staticmethod
    @ep.get("/{note_id}")
    async def get_note(request: Request, note_id: int) -> _NoteAPI:
        with context(request) as ctx:
            note = await Notes.__uc.get(ctx, note_id)

            return _NoteAPI(
                id=note.id,
                title=note.title,
                description=note.description,
                locked=note.locked,
                blocks=[_BlockAPI.from_entity(block) for block in note.blocks],
            )

    @staticmethod
    @ep.post("/")
    async def create_note(request: Request, body: _NoteCreate) -> _NoteAPI:
        with context(request) as ctx:
            # Convert API blocks to entities
            blocks = [block.to_entity() for block in body.blocks] if body.blocks else None

            note = await Notes.__uc.create(ctx, title=body.title, description=body.description, blocks=blocks)

            return _NoteAPI(
                id=note.id,
                title=note.title,
                description=note.description,
                locked=note.locked,
                blocks=[_BlockAPI.from_entity(block) for block in note.blocks],
            )

    @staticmethod
    @ep.put("/{note_id}")
    async def update_note(request: Request, note_id: int, body: _NoteUpdate):
        try:
            with context(request) as ctx:
                note = await Notes.__uc.update(ctx, note_id=note_id, title=body.title, description=body.description)

                return _NoteAPI(
                    id=note.id,
                    title=note.title,
                    description=note.description,
                    locked=note.locked,
                    blocks=[_BlockAPI.from_entity(block) for block in note.blocks],
                )
        except NoteLockedException as e:
            return Notes._handle_locked_error(e)

    @staticmethod
    @ep.delete("/{note_id}")
    async def delete_note(request: Request, note_id: int):
        with context(request) as ctx:
            await Notes.__uc.delete(ctx, note_id)

            return {"status": "deleted"}

    @staticmethod
    @ep.post("/{note_id}/lock")
    async def lock_note(request: Request, note_id: int) -> _NoteAPI:
        """Lock a note to prevent modifications."""
        with context(request) as ctx:
            note = await Notes.__uc.lock(ctx, note_id)

            return _NoteAPI(
                id=note.id,
                title=note.title,
                description=note.description,
                locked=note.locked,
                blocks=[_BlockAPI.from_entity(block) for block in note.blocks],
            )

    @staticmethod
    @ep.post("/{note_id}/unlock")
    async def unlock_note(request: Request, note_id: int) -> _NoteAPI:
        """Unlock a note to allow modifications."""
        with context(request) as ctx:
            note = await Notes.__uc.unlock(ctx, note_id)

            return _NoteAPI(
                id=note.id,
                title=note.title,
                description=note.description,
                locked=note.locked,
                blocks=[_BlockAPI.from_entity(block) for block in note.blocks],
            )

    @staticmethod
    @ep.get("/{note_id}/blocks")
    async def list_blocks(request: Request, note_id: int) -> list[_BlockAPI]:
        with context(request) as ctx:
            blocks = await Notes.__uc.list_blocks(ctx, note_id)

            return [_BlockAPI.from_entity(block) for block in blocks]

    @staticmethod
    @ep.put("/{note_id}/blocks/batch")
    async def batch_upsert_blocks(request: Request, note_id: int, body: _BlockBatchUpdate):
        """Batch upsert blocks - updates existing blocks or creates new ones."""
        try:
            with context(request) as ctx:
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

                upserted_blocks = await Notes.__uc.batch_upsert_blocks(ctx, note_id, updates)

                return [_BlockAPI.from_entity(block) for block in upserted_blocks]
        except NoteLockedException as e:
            return Notes._handle_locked_error(e)

    @staticmethod
    @ep.post("/{note_id}/blocks")
    async def create_block(request: Request, note_id: int, body: _BlockCreate):
        try:
            with context(request) as ctx:
                # Convert API representation to entity (type -> kind)
                block_entity = BlockEntity(
                    id=body.id,
                    kind=body.type,
                    content=body.content,
                    position=body.position,
                )

                block = await Notes.__uc.create_block(ctx, note_id=note_id, block=block_entity)

                return _BlockAPI.from_entity(block)
        except NoteLockedException as e:
            return Notes._handle_locked_error(e)

    @staticmethod
    @ep.put("/{note_id}/blocks/{block_id}")
    async def update_block(request: Request, note_id: int, block_id: str, body: _BlockUpdate):
        try:
            with context(request) as ctx:
                # Convert 'type' to 'kind' if provided
                kind = body.type if body.type is not None else None

                block = await Notes.__uc.update_block(
                    ctx,
                    block_id=block_id,
                    kind=kind,
                    content=body.content,
                    position=body.position,
                )

                return _BlockAPI.from_entity(block)
        except NoteLockedException as e:
            return Notes._handle_locked_error(e)

    @staticmethod
    @ep.delete("/{note_id}/blocks/{block_id}")
    async def delete_block(request: Request, note_id: int, block_id: str):
        try:
            with context(request) as ctx:
                await Notes.__uc.delete_block(ctx, block_id)

                return {"status": "deleted"}
        except NoteLockedException as e:
            return Notes._handle_locked_error(e)
