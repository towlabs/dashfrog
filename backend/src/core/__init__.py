from asyncio import get_event_loop
from functools import partial
from typing import Callable

from .config import Config


def str_to_bool(value: str) -> bool:
    return value.lower() in ("true", "t", "1")


async def as_async(func: Callable, *args, **kwargs):
    loop = get_event_loop()

    return await loop.run_in_executor(None, partial(func, *args, **kwargs))


__all__ = ["str_to_bool", "Config", "as_async"]
