from contextvars import Context

from structlog import BoundLogger

from src.adapters.stores import (
    Blocks as BlocksStore,
    Notes as NotesStore,
)
from src.core import AsyncSessionMaker
from src.domain.entities import Block, Note

List = list


class Notes:
    def __init__(
        self,
        notes_store: NotesStore,
        blocks_store: BlocksStore,
        session_maker: AsyncSessionMaker,
        logger: BoundLogger,
    ):
        self.__log = logger.bind(name="usecases.Notes")
        self.__notes = notes_store
        self.__blocks = blocks_store
        self.__session_maker = session_maker

    async def list(self, _ctx: Context) -> list[Note]:
        log = self.__log.bind(action="list")

        async with self.__session_maker.begin():
            notes = await self.__notes.list()

        log.debug("Success !")
        return notes

    async def get(self, _ctx: Context, note_id: int) -> Note:
        log = self.__log.bind(action="get", note_id=note_id)

        async with self.__session_maker.begin():
            note = await self.__notes.get(note_id)

        log.debug("Success !")
        return note

    async def create(
        self,
        _ctx: Context,
        title: str,
        description: str | None = None,
        blocks: List[Block] | None = None,
    ) -> Note:
        log = self.__log.bind(action="create", title=title)

        async with self.__session_maker.begin():
            note = await self.__notes.create(title, description, blocks)

        log.debug("Success !")
        return note

    async def update(
        self,
        _ctx: Context,
        note_id: int,
        title: str | None = None,
        description: str | None = None,
    ) -> Note:
        log = self.__log.bind(action="update", note_id=note_id)

        async with self.__session_maker.begin():
            new_values = {}
            if title is not None:
                new_values["title"] = title
            if description is not None:
                new_values["description"] = description

            note = await self.__notes.update(note_id, **new_values)

        log.debug("Success !")
        return note

    async def delete(self, _ctx: Context, note_id: int) -> None:
        log = self.__log.bind(action="delete", note_id=note_id)

        async with self.__session_maker.begin():
            await self.__notes.delete(note_id)

        log.debug("Success !")

    async def list_blocks(self, _ctx: Context, note_id: int) -> List[Block]:
        log = self.__log.bind(action="list_blocks", note_id=note_id)

        async with self.__session_maker.begin():
            blocks = await self.__blocks.list(note_id)

        log.debug("Success !")
        return blocks

    async def create_block(
        self,
        _ctx: Context,
        note_id: int,
        block: Block,
    ) -> Block:
        log = self.__log.bind(action="create_block", note_id=note_id, block_id=block.id)

        async with self.__session_maker.begin():
            created_block = await self.__blocks.create(note_id, block)

        log.debug("Success !")
        return created_block

    async def update_block(
        self,
        _ctx: Context,
        block_id: str,
        kind: str | None = None,
        content: dict | None = None,
        position: int | None = None,
    ) -> Block:
        log = self.__log.bind(action="update_block", block_id=block_id)

        async with self.__session_maker.begin():
            new_values = {}
            if kind is not None:
                new_values["kind"] = kind
            if content is not None:
                new_values["content"] = content
            if position is not None:
                new_values["position"] = position

            updated_block = await self.__blocks.update(block_id, **new_values)

        log.debug("Success !")
        return updated_block

    async def delete_block(self, _ctx: Context, block_id: str) -> None:
        log = self.__log.bind(action="delete_block", block_id=block_id)

        async with self.__session_maker.begin():
            await self.__blocks.delete(block_id)

        log.debug("Success !")

    async def batch_upsert_blocks(
        self,
        _ctx: Context,
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
        log = self.__log.bind(action="batch_upsert_blocks", note_id=note_id, count=len(updates))

        async with self.__session_maker.begin():
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

            upserted_blocks = await self.__blocks.batch_upsert(note_id, store_updates)

        log.debug("Success !")
        return upserted_blocks
