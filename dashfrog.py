from contextlib import contextmanager
from typing import TYPE_CHECKING, Self, Any
from opentelemetry import trace, baggage
from opentelemetry.context import Context
from opentelemetry.exporter.jaeger.thrift import JaegerExporter
from opentelemetry.sdk.resources import Resource

from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import  BatchSpanProcessor

import const

try:
    from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
except ImportError:
    FastAPIInstrumentor = None

try:
    from opentelemetry.instrumentation.flask import FlaskInstrumentor
except ImportError:
    FlaskInstrumentor = None

from process import Process

if TYPE_CHECKING: # Only import for type checking as it could lead to import errors when not using all extra features.
    from fastapi import FastAPI
    from flask import Flask

trace.set_tracer_provider(TracerProvider(resource=Resource.create(attributes={"service.name": "dashfrog"})))
tracer = trace.get_tracer(__name__)
exp = JaegerExporter(agent_host_name="0.0.0.0", agent_port=6831)
trace.get_tracer_provider().add_span_processor(BatchSpanProcessor(exp))


class Wrapentel:
    __web_app: "FastAPI | Flask | None"
    __web_provider: str | None
    __active_process: dict[str, Process]

    def __init__(self):
        self.__web_app = None
        self.__web_provider = None
        self.__active_process = {}

    def with_flask(self, flask_app: "Flask") -> Self:
        self.__web_app = flask_app
        self.__web_provider = "flask"

        if not FlaskInstrumentor:
            raise ImportError("Install using 'pip install wrapentel[flask]'.")

        FlaskInstrumentor.instrument_app(flask_app)
        return self

    def with_fastapi(self, fastapi_app: "FastAPI") -> Self:
        self.__web_app = fastapi_app
        self.__web_provider = "fastapi"

        if not FastAPIInstrumentor:
            raise ImportError("Install using 'pip install wrapentel[fast-api]'.")

        FastAPIInstrumentor.instrument_app(fastapi_app)
        return self

    @contextmanager
    def start_process(self, name: str, *, log_start: bool = False, log_kwargs: bool = False, log_context: dict[str,Any] = {}, **kwargs):
        with tracer.start_as_current_span(name, kind=trace.SpanKind.PRODUCER) as span:
            span.set_attribute("process.name", name)
            span.set_attribute("app.open_tel.helper", const.DASHFROG_TRACE_KEY)
            if self.__web_provider:
                span.set_attribute("process.provider", self.__web_provider)

            for key, value in kwargs.items():
                span.set_attribute(key, value)

            if log_start:
                ctx = {"name": name, **log_context}
                if log_kwargs:
                    ctx.update(kwargs)

                span.add_event("process.start", ctx)

            yield span

if __name__ == "__main__":
    wrapentel = Wrapentel()
    with wrapentel.start_process("test"):
        print("test")

        with tracer.start_span("test2") as span:
            span.set_attribute("vodka", "bad")

    with wrapentel.start_process("nintendo", log_start=True, log_context={"test": "contex", "bool": True}):
        with tracer.start_span("mario") as span:
            span.set_attribute("game", "mario_sunshine")
            child_ctx = baggage.set_baggage("context", "child")

            with tracer.start_span("luigi", context=child_ctx) as span2:
                span2.add_event("jumped", {"height": 100})

            with tracer.start_span("bowser", child_ctx) as span3:
                span3.add_event("launch", {"height": 110})

        with tracer.start_span("tlz") as span4:
            span4.add_event("jumped", {"height": 100})