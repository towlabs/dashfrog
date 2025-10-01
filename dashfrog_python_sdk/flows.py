from contextlib import contextmanager
from typing import Generator, Self

from dashfrog_python_sdk import core

from opentelemetry.trace import Span, SpanKind, Tracer


class Flow:
    """Flow is a thread of events happening during a watched process."""

    name: str
    __web_provider: str | None

    def __init__(
        self,
        span: Span,
        tracer: Tracer,
        name: str,
        description: str | None = None,
        web_provider: str | None = None,
    ):
        self.name = name
        self.__span = span
        self.__tracer = tracer
        self.__web_provider = web_provider

        span.set_attribute("flow.name", name)
        if description:
            span.set_attribute("flow.description", description)

        span.set_attribute("app.open_tel.helper", core.DASHFROG_TRACE_KEY)
        if self.__web_provider:
            span.set_attribute("process.provider", self.__web_provider)

    def event(self, name: str, description: str | None = None, **labels) -> Self:
        """Add event to flow"""
        if description:
            labels["description"] = description

        self.__span.add_event(name, labels)

        return self

    @contextmanager
    def flow(
        self, name: str, description: str | None = None, **kwargs
    ) -> Generator["Flow", None, None]:
        """Start a child flow"""

        with self.__tracer.start_span(name, kind=SpanKind.INTERNAL, **kwargs) as span:
            yield Flow(span, self.__tracer, name, description, self.__web_provider)
