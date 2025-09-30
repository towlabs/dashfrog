from contextlib import contextmanager
from typing import Self

import const

from opentelemetry.trace import Span, SpanKind, Tracer


class Process:
    name: str
    __web_provider: str | None

    def __init__(self, name: str, span: Span, tracer: Tracer, web_provider: str | None):
        self.name = name
        self.__span = span
        self.__tracer = tracer
        self.__web_provider = web_provider

        span.set_attribute("process.name", name)
        span.set_attribute("app.open_tel.helper", const.DASHFROG_TRACE_KEY)
        if self.__web_provider:
            span.set_attribute("process.provider", self.__web_provider)

    def event(self, name: str, **kwargs) -> Self:
        self.__span.add_event(name, kwargs)

        return self

    @contextmanager
    def step(self, name: str, **kwargs):
        with self.__tracer.start_span(name, kind=SpanKind.INTERNAL, **kwargs):
            yield self
