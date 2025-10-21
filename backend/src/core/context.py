from collections.abc import Generator
from contextlib import contextmanager
from contextvars import Context, ContextVar, copy_context
from typing import Any, TypeVar
from uuid import uuid4

from fastapi import Request
from sqlalchemy.ext.asyncio import AsyncSession
from structlog.contextvars import STRUCTLOG_KEY_PREFIX, clear_contextvars

# Append STRUCTLOG_KEY_PREFIX to all context vars to ensure auto logging with structlog
REQUEST_ID: ContextVar[str | None] = ContextVar(f"{STRUCTLOG_KEY_PREFIX}REQUEST_ID", default=None)
USER_ID: ContextVar[str | None] = ContextVar(f"{STRUCTLOG_KEY_PREFIX}USER_ID", default=None)
TENANT_ID: ContextVar[str | None] = ContextVar(f"{STRUCTLOG_KEY_PREFIX}TENANT_ID", default=None)
APP_VERSION: ContextVar[str | None] = ContextVar(f"{STRUCTLOG_KEY_PREFIX}APP_VERSION", default=None)
ENV: ContextVar[str | None] = ContextVar(f"{STRUCTLOG_KEY_PREFIX}ENV", default="prod")
RELEASE: ContextVar[str | None] = ContextVar(f"{STRUCTLOG_KEY_PREFIX}RELEASE", default="0.0.0")

# Functional context must not be logged
SESSION: ContextVar[AsyncSession | None] = ContextVar("session")
BLACKLISTED_LABELS: ContextVar[list[str]] = ContextVar("blacklisted_labels", default=[])

T = TypeVar("T")


def with_value(key: str, value: T, always_log: bool = True) -> ContextVar[T]:
    if always_log:
        key = f"{STRUCTLOG_KEY_PREFIX}{key}"

    var = ContextVar(key)
    var.set(value)
    return var


def bg_context(
    request: Request | None = None,
    request_id: str | None = None,
    user_id: str | None = None,
    ensure_request_id: bool = True,
    **kwargs: dict[str, Any],
) -> None:
    if not request_id and ensure_request_id:
        request_id = str(uuid4())

    if request is not None:
        if hasattr(request.state, "request_id"):
            request_id = request.state.request_id
        if hasattr(request.state, "user"):
            user_id = request.state.user.get("user_id", request.state.user.get("id"))
        if hasattr(request.state, "app_version"):
            app_version = request.state.app_version
            APP_VERSION.set(app_version)

    if request_id:
        REQUEST_ID.set(request_id)

    if user_id:
        USER_ID.set(user_id)

    for key, value in kwargs.items():
        with_value(key, value)


@contextmanager
def context(
    request: Request | None = None,
    request_id: str | None = None,
    user_id: str | None = None,
    ensure_request_id: bool = True,
    **kwargs: dict[str, Any],
) -> Generator[Context, None, None]:
    bg_context(
        request,
        request_id,
        user_id,
        ensure_request_id,
        **kwargs,
    )

    ctx = copy_context()
    yield ctx
    clear_contextvars()  # Reset loggable context to avoid pollution
