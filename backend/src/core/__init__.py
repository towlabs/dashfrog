from asyncio import get_event_loop
from contextlib import asynccontextmanager
from functools import partial
from typing import Callable

from sqlalchemy.ext.asyncio import async_sessionmaker

from .config import Config
from .context import SESSION


def str_to_bool(value: str) -> bool:
    return value.lower() in ("true", "t", "1")


class AsyncSessionMaker:
    def __init__(self, session_maker: async_sessionmaker):
        self.__maker = session_maker

    @asynccontextmanager
    async def begin(self):
        async with self.__maker.begin() as session:
            SESSION.set(session)
            yield session
            SESSION.set(None)


async def as_async(func: Callable, *args, **kwargs):
    loop = get_event_loop()

    return await loop.run_in_executor(None, partial(func, *args, **kwargs))


__all__ = ["str_to_bool", "AsyncSessionMaker", "Config", "as_async"]
