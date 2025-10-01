from contextlib import contextmanager
from contextvars import ContextVar, copy_context, Context
from typing import TypeVar, Any
from collections.abc import Generator
from uuid import uuid4

from sentry_sdk import set_tag, set_user
from fastapi import Request
import structlog
from structlog.contextvars import clear_contextvars

# Append STRUCTLOG_KEY_PREFIX to all context vars to ensure auto logging with structlog
REQUEST_ID: ContextVar[str | None] = ContextVar(f"{structlog.contextvars.STRUCTLOG_KEY_PREFIX}REQUEST_ID", default=None)
USER_ID: ContextVar[str | None] = ContextVar(f"{structlog.contextvars.STRUCTLOG_KEY_PREFIX}USER_ID", default=None)
TENANT_ID: ContextVar[str | None] = ContextVar(f"{structlog.contextvars.STRUCTLOG_KEY_PREFIX}TENANT_ID", default=None)
APP_VERSION: ContextVar[str | None] = ContextVar(
    f"{structlog.contextvars.STRUCTLOG_KEY_PREFIX}APP_VERSION", default=None
)
ENV: ContextVar[str | None] = ContextVar(f"{structlog.contextvars.STRUCTLOG_KEY_PREFIX}ENV", default="prod")
RELEASE: ContextVar[str | None] = ContextVar(f"{structlog.contextvars.STRUCTLOG_KEY_PREFIX}RELEASE", default="0.0.0")

T = TypeVar("T")


def with_value(key: str, value: T, always_log: bool = True) -> ContextVar[T]:
    if always_log:
        key = f"{structlog.contextvars.STRUCTLOG_KEY_PREFIX}{key}"

    var = ContextVar(key)
    var.set(value)
    return var


def bg_context(
    request: Request | None = None,
    request_id: str | None = None,
    user_id: str | None = None,
    set_sentry_context: bool = True,
    transport: str | None = None,
    ensure_request_id: bool = True,
    **kwargs: dict[str, Any],
) -> None:
    if not request_id and ensure_request_id:
        request_id = str(uuid4())

    if request is not None:
        transport = "rest-api"
        if hasattr(request.state, "request_id"):
            request_id = request.state.request_id
        if hasattr(request.state, "user"):
            user_id = request.state.user.get("user_id", request.state.user.get("id"))
            _ = set_sentry_context and set_user(request.state.user)
        if hasattr(request.state, "app_version"):
            app_version = request.state.app_version
            APP_VERSION.set(app_version)

    if request_id:
        REQUEST_ID.set(request_id)
        _ = set_sentry_context and set_tag("request_id", request_id)

    if user_id:
        USER_ID.set(user_id)
        _ = set_sentry_context and set_tag("user_id", user_id)

    if transport:
        _ = set_sentry_context and set_tag("transport", transport)

    for key, value in kwargs.items():
        with_value(key, value)


@contextmanager
def context(
    request: Request | None = None,
    request_id: str | None = None,
    user_id: str | None = None,
    set_sentry_context: bool = True,
    transport: str | None = None,
    ensure_request_id: bool = True,
    **kwargs: dict[str, Any],
) -> Generator[Context, None, None]:
    bg_context(request, request_id, user_id, tenant_id, set_sentry_context, transport, ensure_request_id, **kwargs)

    ctx = copy_context()
    yield ctx
    clear_contextvars()  # Reset loggable context to avoid pollution
