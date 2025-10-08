from collections.abc import Generator
from contextlib import AbstractContextManager, contextmanager
from types import TracebackType
from typing import Any, Self

from dashfrog_python_sdk import core

from opentelemetry import baggage, context
from opentelemetry.trace import Link, Span, StatusCode, Tracer
from opentelemetry.util.types import AttributeValue


class BaseSpan(AbstractContextManager):
    name: str
    __span: Span
    __tracer: Tracer
    __attributes: dict[str, AttributeValue]
    __ctx_token: Any
    _kind: str = "base"

    def __init__(
        self,
        tracer: Tracer,
        name: str,
        description: str | None = None,
        as_current_span: bool = False,
        end_on_exit: bool = True,
        ctx: dict[str, AttributeValue] | None = None,
        **labels: AttributeValue,
    ) -> None:
        self.name = name
        self.__tracer = tracer
        self.__end_on_exit = end_on_exit
        self.__as_current_span = as_current_span

        attributes = {"app.open_tel.helper": core.DASHFROG_TRACE_KEY}
        for key, value in labels.items():
            attributes[f"label.{key}"] = value

        if description:
            attributes[f"{self._kind}.description"] = description

        if context:
            attributes.update(ctx)

    def __enter__(self):
        """Return `self` upon entering the runtime context."""
        ctx = baggage.set_baggage(f"current_{self._kind}", self.name)
        self.__ctx_token = context.attach(ctx)

        starter = self.__tracer.start_as_current_span if self.__as_current_span else self.__tracer.start_span
        with starter(self.name) as span:
            self.__span = span
            span.set_attribute(f"{self._kind}.name", self.name)
            span.set_attributes(self.__attributes)

            with self.__tracer.start_span(f"{self._kind}.start", links=[Link(span.get_span_context())]) as start_span:
                start_span.set_attributes(self.__attributes)
                span.set_attribute(f"{self._kind}.name", self.name)

            return self

    def __exit__(
        self,
        exc_type: type[BaseException] | None,
        exc_value: BaseException | None,
        traceback: TracebackType | None,
    ):
        """Raise any exception triggered within the runtime context."""
        if self.__end_on_exit or exc_value is not None:
            with self.__tracer.start_span(
                f"{self._kind}.end", links=[Link(self.__span.get_span_context())]
            ) as end_span:
                if exc_value is not None:
                    end_span.record_exception(exc_value)
                    end_span.set_status(StatusCode.ERROR)
                else:
                    end_span.set_status(StatusCode.OK)

                end_span.set_attributes(self.__attributes)
                end_span.set_attribute(f"{self._kind}.name", self.name)

        context.detach(self.__ctx_token)
        return None

    def __repr__(self) -> str:
        return f"{self.__class__.__name__}({self.name!r})"

    def event(self, name: str, description: str | None = None, **labels) -> Self:
        """Add event to flow"""
        if description:
            labels["description"] = description

        self.__span.add_event(name, labels)

        return self


class Flow(BaseSpan):
    """Flow is a thread of events happening during a watched process."""

    name: str
    __kind = "flow"

    def __init__(
        self,
        tracer: Tracer,
        name: str,
        description: str | None = None,
        **labels,
    ):
        current_baggage = baggage.get_all()


        ctx = {}
        src_flow = current_baggage.get(f"current_{Flow._kind}")
        if src_flow:
            ctx[f"{self._kind}.src.name"] = str(src_flow)

        src_step = current_baggage.get(f"current_{self._kind}")
        if src_step:
            ctx[f"{Step._kind}.src.name"] = str(src_step)

        super().__init__(tracer, name,description, **labels)

    @contextmanager
    def step(self, name: str, description: str | None = None, **kwargs) -> Generator["Step", None, None]:
        """Start a child flow"""

        with Step(self.__tracer, name, description) as step:
            yield step


class Step(BaseSpan):
    _kind = "step"

    def __init__(self, tracer: Tracer, name, description: str | None = None, end_on_exit: bool = False, **labels):
        current_baggage = baggage.get_all()


        ctx = {}
        src_flow = current_baggage.get(f"current_{Flow._kind}")
        if src_flow:
            ctx[f"{Flow._kind}.name"] = str(src_flow)

        src_step = current_baggage.get(f"current_{self._kind}")
        if src_step:
            ctx[f"{self._kind}.src.name"] = str(src_step)

        super().__init__(tracer, name, description, end_on_exit=end_on_exit, ctx=ctx, **labels)
