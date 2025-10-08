from collections.abc import Generator
from contextlib import AbstractContextManager, contextmanager
from types import TracebackType
from typing import Any

import shortuuid
from structlog import get_logger

from dashfrog_python_sdk import core

from opentelemetry import baggage, context
from opentelemetry.util.types import AttributeValue


class BaseSpan(AbstractContextManager):
    name: str

    __attributes: dict[str, AttributeValue]
    __ctx_token: Any
    _kind: str

    def __init__(
        self,
        name: str,
        description: str | None = None,
        auto_start: bool = True,
        auto_end: bool = True,
        ctx: dict[str, AttributeValue] | None = None,
        **labels: AttributeValue,
    ) -> None:
        self.name = name
        self.__auto_end = auto_end
        self.__auto_start = auto_start

        attributes = {"app.open_tel.helper": core.DASHFROG_TRACE_KEY, **labels}

        if description:
            attributes[f"{self._kind}.description"] = description

        if ctx:
            attributes.update(ctx)

        self.__attributes = attributes

    def __enter__(self):
        """Return `self` upon entering the runtime context."""

        ctx = baggage.set_baggage(f"current_{self._kind}", self.name)
        ctx = baggage.set_baggage(f"current_{self._kind}_id", str(shortuuid.uuid()), ctx)
        self.__ctx_token = context.attach(ctx)

        logger = get_logger(kind=self._kind, name=self.name, attached_context=baggage.get_all())
        logger.info(
            f"creating object {self._kind}::{self.name}", kind=self._kind, name=self.name, labels=self.__attributes
        )
        if self.__auto_start:
            logger.info(f"starting object {self._kind}::{self.name}", kind=self._kind, name=self.name)

        return self

    def __exit__(
        self,
        exc_type: type[BaseException] | None,
        exc_value: BaseException | None,
        traceback: TracebackType | None,
    ):
        """Raise any exception triggered within the runtime context."""
        logger = get_logger(kind=self._kind, name=self.name, attached_context=baggage.get_all())

        if self.__auto_end or exc_value is not None:
            if exc_value is not None:
                logger.error(f"ending object {self._kind}::{self.name} with error")  # , exc_info=exc_value)
            else:
                logger.info(
                    f"ending object  {self._kind}::{self.name}",
                    kind=self._kind,
                    name=self.name,
                )

        context.detach(self.__ctx_token)
        return None

    def __repr__(self) -> str:
        return f"{self.__class__.__name__}({self.name!r})"

    @classmethod
    def start(cls):
        # TODO get flow from storage when enabled

        ctx = baggage.get_all()
        logger = get_logger(kind=cls._kind, attached_context=ctx)

        name = ctx.get(f"current_{cls._kind}")
        if not name:
            logger.warning(f"Cannot start: no current {cls._kind} defined")

        logger.info(f"starting object: {cls._kind}::{name}", kind=cls._kind, name=name)

        return None

    @classmethod
    def end(cls):
        # TODO get flow from storage when enabled

        ctx = baggage.get_all()
        logger = get_logger(kind=cls._kind, attached_context=ctx)

        name = ctx.get(f"current_{cls._kind}")
        if not name:
            logger.warning(f"Cannot end: no current {cls._kind} defined")

        logger.info(f"ending object: {cls._kind}::{name}", kind=cls._kind, name=name)

        return None

    # def event(self, name: str, description: str | None = None, **labels) -> Self:
    #     """Add event to flow"""
    #     if description:
    #         labels["description"] = description
    #
    #     self.__span.add_event(name, labels)
    #
    #     return self


class Flow(BaseSpan):
    """Flow is a thread of events happening during a watched process."""

    name: str
    _kind = "flow"

    def __init__(
        self,
        name: str,
        description: str | None = None,
        auto_end: bool = True,
        **labels,
    ):
        current_baggage = baggage.get_all()

        ctx = {}
        src_flow = current_baggage.get(f"current_{Flow._kind}")
        if src_flow:
            ctx[f"{self._kind}.src.name"] = str(src_flow)

        super().__init__(name, description, auto_end=auto_end, ctx=ctx, **labels)

    @contextmanager
    def step(self, name: str, description: str | None = None, **labels) -> Generator["Step", None, None]:
        """Start a child flow"""

        with Step(name, description, **labels) as step:
            yield step


class Step(BaseSpan):
    _kind = "step"

    def __init__(
        self,
        name,
        description: str | None = None,
        auto_start: bool = True,
        auto_end: bool = True,
        **labels,
    ):
        current_baggage = baggage.get_all()

        ctx = {}
        src_flow = current_baggage.get(f"current_{Flow._kind}")
        if src_flow:
            ctx[f"{Flow._kind}.name"] = str(src_flow)

        src_step = current_baggage.get(f"current_{self._kind}")
        if src_step:
            ctx[f"{self._kind}.src.name"] = str(src_step)

        super().__init__(name, description, auto_start=auto_start, auto_end=auto_end, ctx=ctx, **labels)
