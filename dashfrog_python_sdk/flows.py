from contextlib import contextmanager
from typing import Generator, Self

from dashfrog_python_sdk import core

from opentelemetry.trace import Span, SpanKind, Tracer


class BaseSpan:
    name: str
    __span: Span

    def __init__(self, span: Span, name: str, **labels):
        self.name = name
        self.__span = span

        span.set_attribute("app.open_tel.helper", core.DASHFROG_TRACE_KEY)

        for key, value in labels.items():
            span.set_attribute(key, value)

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

    def __init__(
        self,
        span: Span,
        tracer: Tracer,
        name: str,
        description: str | None = None,
        **labels,
    ):
        super().__init__(span, name, **labels)
        self.__tracer = tracer

        span.set_attribute("flow.name", name)
        if description:
            span.set_attribute("flow.description", description)

    @contextmanager
    def flow(
        self, name: str, description: str | None = None, **kwargs
    ) -> Generator["Flow", None, None]:
        """Start a child flow"""

        with self.__tracer.start_span(name, kind=SpanKind.INTERNAL, **kwargs) as span:
            yield Flow(span, self.__tracer, name, description)


class Debug(BaseSpan):
    def __init__(self, span: Span, name, description: str | None = None, **labels):
        super().__init__(span, name, **labels)
        span.set_attribute("debug.name", name)
        if description:
            span.set_attribute("debug.description", description)


class TechContext(BaseSpan):
    def __init__(self, span: Span, name, description: str | None = None, **labels):
        super().__init__(span, name, **labels)
        span.set_attribute("tech_ctx.name", name)
        if description:
            span.set_attribute("tech_ctx.description", description)
