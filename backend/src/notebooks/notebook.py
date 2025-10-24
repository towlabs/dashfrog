from __future__ import annotations

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from core.context import get_app

from .entities import Block, Note
from .exceptions import NoteLockedException
from .model import (
    Block as BlockModel,
    Note as NoteModel,
)

List = list


class Notebooks:
    def __init__(self):
        self.logger = get_app().log("notebooks")

    async def list(self) -> List[Note]:
        log = self.logger.bind(action="list")

        try:
            async with get_app().sessionmaker.begin() as session:
                query = select(NoteModel).order_by(NoteModel.id.desc())
                notes = await session.execute(query)
                result = [note.to_entity() for note in notes.scalars()]

                log.debug("Success !")
                return result
        except Exception as e:
            log.error("Failed to list notes", error=str(e))
            raise

    async def get(self, note_id: int) -> Note:
        log = self.logger.bind(action="get", note_id=note_id)

        try:
            async with get_app().sessionmaker.begin() as session:
                query = select(NoteModel).filter_by(id=note_id)
                note = (await session.execute(query)).scalar_one()
                result = note.to_entity()

                log.debug("Success !")
                return result
        except Exception as e:
            log.error("Failed to get note", note_id=note_id, error=str(e))
            raise

    async def create(
        self,
        title: str,
        description: str | None = None,
        blocks: List[Block] | None = None,
    ) -> Note:
        log = self.logger.bind(action="create", title=title)

        try:
            async with get_app().sessionmaker.begin() as session:
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

                session.add(note_model)
                await session.flush()
                result = note_model.to_entity()

                log.debug("Success !")
                return result
        except Exception as e:
            log.error("Failed to create note", title=title, error=str(e))
            raise

    async def update(
        self,
        note_id: int,
        title: str | None = None,
        description: str | None = None,
    ) -> Note:
        log = self.logger.bind(action="update", note_id=note_id)

        async with get_app().sessionmaker.begin() as session:
            try:
                # Check if note is locked
                query = select(NoteModel).filter_by(id=note_id)
                note = (await session.execute(query)).scalar_one()
                if note.locked:
                    log.warning("Cannot update locked note", note_id=note_id)
                    raise NoteLockedException(note_id)

                # Update fields
                if title is not None:
                    note.title = title
                if description is not None:
                    note.description = description

                await session.flush()
                result = note.to_entity()

                log.debug("Success !")
                return result
            except NoteLockedException:
                raise
            except Exception as e:
                log.error("Failed to update note", note_id=note_id, error=str(e))
                raise

    async def delete(self, note_id: int) -> None:
        log = self.logger.bind(action="delete", note_id=note_id)

        try:
            async with get_app().sessionmaker.begin() as session:
                await session.execute(delete(NoteModel).where(NoteModel.id == note_id))

                log.debug("Success !")
        except Exception as e:
            log.error("Failed to delete note", note_id=note_id, error=str(e))
            raise

    async def lock(self, note_id: int) -> Note:
        log = self.logger.bind(action="lock", note_id=note_id)

        try:
            async with get_app().sessionmaker.begin() as session:
                note = (await session.execute(select(NoteModel).filter_by(id=note_id))).scalar_one()
                note.locked = True
                await session.flush()
                result = note.to_entity()

                log.debug("Success !")
                return result
        except Exception as e:
            log.error("Failed to lock note", note_id=note_id, error=str(e))
            raise

    async def unlock(self, note_id: int) -> Note:
        log = self.logger.bind(action="unlock", note_id=note_id)

        try:
            async with get_app().sessionmaker.begin() as session:
                note = (await session.execute(select(NoteModel).filter_by(id=note_id))).scalar_one()
                note.locked = False
                await session.flush()
                result = note.to_entity()

                log.debug("Success !")
                return result
        except Exception as e:
            log.error("Failed to unlock note", note_id=note_id, error=str(e))
            raise

    async def list_blocks(self, note_id: int) -> List[Block]:
        log = self.logger.bind(action="list_blocks", note_id=note_id)

        try:
            async with get_app().sessionmaker.begin() as session:
                query = select(BlockModel).filter_by(note_id=note_id).order_by(BlockModel.position)
                blocks = await session.execute(query)
                result = [block.to_entity() for block in blocks.scalars()]

                log.debug("Success !")
                return result
        except Exception as e:
            log.error("Failed to list blocks", note_id=note_id, error=str(e))
            raise

    async def create_block(
        self,
        note_id: int,
        block: Block,
    ) -> Block:
        log = self.logger.bind(action="create_block", note_id=note_id, block_id=block.id)

        try:
            async with get_app().sessionmaker.begin() as session:
                # Check if note is locked
                note = (await session.execute(select(NoteModel).filter_by(id=note_id))).scalar_one()
                if note.locked:
                    log.warning("Cannot create block on locked note", note_id=note_id)
                    raise NoteLockedException(note_id)

                block_model = BlockModel(
                    id=block.id,
                    note_id=note_id,
                    kind=block.kind,
                    content=block.content,
                    position=block.position,
                )

                session.add(block_model)
                await session.flush()
                result = block_model.to_entity()

                log.debug("Success !")
                return result
        except NoteLockedException:
            raise
        except Exception as e:
            log.error("Failed to create block", note_id=note_id, block_id=block.id, error=str(e))
            raise

    async def update_block(
        self,
        block_id: str,
        kind: str | None = None,
        content: dict | None = None,
        position: int | None = None,
    ) -> Block:
        log = self.logger.bind(action="update_block", block_id=block_id)

        try:
            async with get_app().sessionmaker.begin() as session:
                # Check if the block's parent note is locked
                if (locked_note_id := await self.__is_block_locked(block_id, session)) is not None:
                    log.warning("Cannot update block on locked note", block_id=block_id, note_id=locked_note_id)
                    raise NoteLockedException(locked_note_id)

                block = (await session.execute(select(BlockModel).filter_by(id=block_id))).scalar_one()

                if kind is not None:
                    block.kind = kind
                if content is not None:
                    # For content dict, create a new dict object to force SQLAlchemy to detect change
                    block.content = dict(content)
                if position is not None:
                    block.position = position

                await session.flush()
                result = block.to_entity()

                log.debug("Success !")
                return result
        except NoteLockedException:
            raise
        except Exception as e:
            log.error("Failed to update block", block_id=block_id, error=str(e))
            raise

    async def delete_block(self, block_id: str) -> None:
        log = self.logger.bind(action="delete_block", block_id=block_id)

        try:
            async with get_app().sessionmaker.begin() as session:
                # Check if the block's parent note is locked
                if (locked_note_id := await self.__is_block_locked(block_id, session)) is not None:
                    log.warning("Cannot delete block on locked note", block_id=block_id, note_id=locked_note_id)
                    raise NoteLockedException(locked_note_id)

                await session.execute(delete(BlockModel).where(BlockModel.id == block_id))

                log.debug("Success !")
        except NoteLockedException:
            raise
        except Exception as e:
            log.error("Failed to delete block", block_id=block_id, error=str(e))
            raise

    async def batch_upsert_blocks(
        self,
        note_id: int,
        updates: List[tuple[str, str | None, dict | None, int | None]],
    ) -> List[Block]:
        """
        Batch upsert blocks (update existing or create new).

        Args:
            note_id: The note ID for creating new blocks
            updates: List of tuples (block_id, kind, content, position)
                     where kind, content, and position are optional for updates
                     but required for new blocks
        """
        log = self.logger.bind(action="batch_upsert_blocks", note_id=note_id, count=len(updates))

        try:
            async with get_app().sessionmaker.begin() as session:
                # Check if note is locked
                note = (await session.execute(select(NoteModel).filter_by(id=note_id))).scalar_one()
                if note.locked:
                    log.warning("Cannot batch upsert blocks on locked note", note_id=note_id)
                    raise NoteLockedException(note_id)

                # Transform updates into (block_id, new_values) format
                store_updates = []
                for block_id, kind, content, position in updates:
                    new_values = {}
                    if kind is not None:
                        new_values["kind"] = kind
                    if content is not None:
                        new_values["content"] = content
                    if position is not None:
                        new_values["position"] = position

                    store_updates.append((block_id, new_values))

                upserted_blocks = await self.__batch_upsert_blocks(session, note_id, store_updates)

                log.debug("Success !")
                return upserted_blocks
        except NoteLockedException:
            raise
        except Exception as e:
            log.error("Failed to batch upsert blocks", note_id=note_id, error=str(e))
            raise

    # Private methods (former store logic)
    @staticmethod
    async def __is_block_locked(block_id: str, session: AsyncSession) -> int | None:
        """Check if the block's parent note is locked. Returns note_id if locked, None otherwise."""
        result = await session.execute(
            select(NoteModel.id, NoteModel.locked)
            .join(BlockModel, BlockModel.note_id == NoteModel.id)
            .filter(BlockModel.id == block_id)
        )
        note_id, is_locked = result.one()
        return note_id if is_locked else None

    @staticmethod
    async def __batch_upsert_blocks(
        session: AsyncSession, note_id: int, updates: list[tuple[str, dict]]
    ) -> List[Block]:
        """
        Batch upsert blocks (update existing or create new).

        Args:
            note_id: The note ID for creating new blocks
            updates: List of (block_id, new_values) tuples where new_values must include
                    'kind', 'content', and 'position' for new blocks

        Returns:
            List of upserted block entities
        """
        upserted_blocks = []

        for block_id, new_values in updates:
            # Try to find existing block
            result = await session.execute(select(BlockModel).filter_by(id=block_id))
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
                session.add(new_block)
                upserted_blocks.append(new_block)

        await session.flush()
        return [block.to_entity() for block in upserted_blocks]
