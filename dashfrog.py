from contextlib import contextmanager
from typing import TYPE_CHECKING, Self, Any
from opentelemetry import trace
from opentelemetry.exporter.jaeger.thrift import JaegerExporter
from opentelemetry.sdk.resources import Resource

from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.trace import Span, Link

try:
    from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
except ImportError:
    FastAPIInstrumentor = None

try:
    from opentelemetry.instrumentation.flask import FlaskInstrumentor
except ImportError:
    FlaskInstrumentor = None

from process import Process

if TYPE_CHECKING:  # Only import for type checking as it could lead to import errors when not using all extra features.
    from fastapi import FastAPI
    from flask import Flask


class DashFrog:
    __web_provider: str | None
    __active_process: dict[str, Process]

    def __init__(self, service_name: str):
        self.__web_provider = None
        self.__active_process = {}

        trace.set_tracer_provider(
            TracerProvider(
                resource=Resource.create(
                    attributes={
                        "service.name": service_name,
                        "service.provider": "tower.dashfrog",
                        "dashfrog.version": "alpha",
                    }
                )
            )
        )

        self.__tracer = trace.get_tracer(__name__)
        exp = JaegerExporter(agent_host_name="0.0.0.0", agent_port=6831)
        trace.get_tracer_provider().add_span_processor(BatchSpanProcessor(exp))

    def with_flask(self, flask_app: "Flask") -> Self:
        self.__web_provider = "flask"

        if not FlaskInstrumentor:
            raise ImportError("Install using 'pip install dashfrog[flask]'.")

        FlaskInstrumentor.instrument_app(flask_app)
        return self

    def with_fastapi(self, fastapi_app: "FastAPI") -> Self:
        self.__web_provider = "fastapi"

        if not FastAPIInstrumentor:
            raise ImportError("Install using 'pip install dashfrog[fast-api]'.")

        FastAPIInstrumentor.instrument_app(fastapi_app)
        return self

    @contextmanager
    def start_process(
        self,
        name: str,
        *,
        link_with: Span | None = None,
        log_start: bool = False,
        log_kwargs: bool = False,
        log_context: dict[str, Any] = {},
        **kwargs,
    ):
        with self.__tracer.start_as_current_span(
            name,
            kind=trace.SpanKind.PRODUCER,
            links=[Link(link_with.get_span_context())] if link_with else [],
        ) as span:
            process = Process(name, span, self.__web_provider)
            if log_start:
                ctx = {"name": name, **log_context}
                if log_kwargs:
                    ctx.update(kwargs)

                span.add_event("process.start", ctx)

            for key, value in kwargs.items():
                span.set_attribute(key, value)

            yield process


if __name__ == "__main__":
    dashFrog = DashFrog("mu-thay")
    with dashFrog.start_process("test"):
        ...
