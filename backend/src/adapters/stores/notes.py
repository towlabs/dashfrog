from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.context import SESSION
from src.domain import entities

from .models.notes import (
    Block as BlockModel,
    Note as NoteModel,
)

List = list


def _get_session() -> AsyncSession:
    if not (session := SESSION.get()):
        raise AttributeError("No session available")

    return session


class Notes:
    @staticmethod
    async def list() -> list[entities.Note]:
        query = select(NoteModel).order_by(NoteModel.id.desc())
        notes = await _get_session().execute(query)

        return [note.to_entity() for note in notes.scalars()]

    @staticmethod
    async def get(note_id: int) -> entities.Note:
        query = select(NoteModel).filter_by(id=note_id)
        note = (await _get_session().execute(query)).scalar_one()

        return note.to_entity()

    @staticmethod
    async def create(
        title: str, description: str | None = None, blocks: List[entities.Block] | None = None
    ) -> entities.Note:
        db = _get_session()

        note_model = NoteModel(
            title=title,
            description=description,
            blocks=[
                BlockModel(
                    id=block.id,
                    kind=block.kind,
                    content=block.content,
                    position=block.position,
                )
                for block in (blocks or [])
            ],
        )

        db.add(note_model)
        await db.flush()

        return note_model.to_entity()

    @staticmethod
    async def update(note_id: int, **new_values) -> entities.Note:
        db = _get_session()

        note = (await db.execute(select(NoteModel).filter_by(id=note_id))).scalar_one()

        for field, value in new_values.items():
            setattr(note, field, value)

        await db.flush()

        return note.to_entity()

    @staticmethod
    async def delete(note_id: int) -> None:
        db = _get_session()
        await db.execute(delete(NoteModel).where(NoteModel.id == note_id))


class Blocks:
    @staticmethod
    async def list(note_id: int) -> list[entities.Block]:
        query = select(BlockModel).filter_by(note_id=note_id).order_by(BlockModel.position)
        blocks = await _get_session().execute(query)

        return [block.to_entity() for block in blocks.scalars()]

    @staticmethod
    async def create(note_id: int, block: entities.Block) -> entities.Block:
        db = _get_session()

        block_model = BlockModel(
            id=block.id,
            note_id=note_id,
            kind=block.kind,
            content=block.content,
            position=block.position,
        )

        db.add(block_model)
        await db.flush()

        return block_model.to_entity()

    @staticmethod
    async def update(block_id: str, **new_values) -> entities.Block:
        db = _get_session()

        block = (await db.execute(select(BlockModel).filter_by(id=block_id))).scalar_one()

        for field, value in new_values.items():
            # For content dict, create a new dict object to force SQLAlchemy to detect change
            if field == "content":
                block.content = dict(value)  # Create new dict object
            else:
                setattr(block, field, value)

        await db.flush()

        return block.to_entity()

    @staticmethod
    async def delete(block_id: str) -> None:
        db = _get_session()
        await db.execute(delete(BlockModel).where(BlockModel.id == block_id))

    @staticmethod
    async def batch_upsert(
        note_id: int, updates: List[tuple[str, dict]]
    ) -> List[entities.Block]:
        """
        Batch upsert blocks (update existing or create new).

        Args:
            note_id: The note ID for creating new blocks
            updates: List of (block_id, new_values) tuples where new_values must include
                    'kind', 'content', and 'position' for new blocks

        Returns:
            List of upserted block entities
        """
        db = _get_session()
        upserted_blocks = []

        for block_id, new_values in updates:
            # Try to find existing block
            result = await db.execute(select(BlockModel).filter_by(id=block_id))
            existing_block = result.scalar_one_or_none()

            if existing_block:
                # Update existing block
                for field, value in new_values.items():
                    # For content dict, create a new dict object to force SQLAlchemy to detect change
                    if field == "content":
                        existing_block.content = dict(value)  # Create new dict object
                    else:
                        setattr(existing_block, field, value)
                upserted_blocks.append(existing_block)
            else:
                # Create new block
                new_block = BlockModel(
                    id=block_id,
                    note_id=note_id,
                    kind=new_values.get("kind", "paragraph"),
                    content=new_values.get("content", {}),
                    position=new_values.get("position", 0),
                )
                db.add(new_block)
                upserted_blocks.append(new_block)

        await db.flush()

        return [block.to_entity() for block in upserted_blocks]
