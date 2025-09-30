from contextlib import contextmanager
from typing import TYPE_CHECKING, Any, Self

from opentelemetry import context, metrics, propagate, trace
from opentelemetry.baggage.propagation import W3CBaggagePropagator
from opentelemetry.exporter.jaeger.thrift import JaegerExporter
from opentelemetry.instrumentation.requests import RequestsInstrumentor
from opentelemetry.propagators.composite import CompositePropagator
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics._internal.export import ConsoleMetricExporter, PeriodicExportingMetricReader
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.trace import INVALID_SPAN, Link, Span
from opentelemetry.trace.propagation.tracecontext import TraceContextTextMapPropagator

# Extra imports for optional instrumentations
try:
    from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
except ImportError:
    FastAPIInstrumentor = None

try:
    from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor
except ImportError:
    HTTPXClientInstrumentor = None

try:
    from opentelemetry.instrumentation.flask import FlaskInstrumentor
except ImportError:
    FlaskInstrumentor = None
from process import Process

if TYPE_CHECKING:  # Only import for type checking as it could lead to import errors when not using all extra features.
    from fastapi import FastAPI
    from flask import Flask

propagate.set_global_textmap(CompositePropagator([TraceContextTextMapPropagator(), W3CBaggagePropagator()]))


class DashFrog:
    __web_provider: str | None

    def __init__(self, service_name: str):
        self.__web_provider = None
        resource = Resource.create(
            attributes={
                "service.name": service_name,
                "service.provider": "tower.dashfrog",
                "dashfrog.version": "alpha",
            }
        )

        exp = JaegerExporter(agent_host_name="0.0.0.0", agent_port=6831)
        exporter = ConsoleMetricExporter()
        reader = PeriodicExportingMetricReader(
            exporter=exporter,
            export_interval_millis=3000,  # Export every 3 seconds
        )

        trace.set_tracer_provider(TracerProvider(resource=resource))
        metrics.set_meter_provider(MeterProvider(metric_readers=[reader], resource=resource))
        trace.get_tracer_provider().add_span_processor(BatchSpanProcessor(exp))

        self.__tracer = trace.get_tracer(__name__)
        self.__meter = metrics.get_meter(__name__)

        RequestsInstrumentor().instrument()
        if HTTPXClientInstrumentor:
            HTTPXClientInstrumentor().instrument()

    def with_flask(self, flask_app: "Flask") -> Self:
        self.__web_provider = "flask"

        if not FlaskInstrumentor:
            raise ImportError("Install using 'pip install dashfrog[flask]'.")

        FlaskInstrumentor.instrument_app(flask_app, meter_provider=metrics.get_meter_provider())

        @flask_app.after_request
        def propagate_context(response):
            propagate.inject(response.headers, context.get_current())
            return response

        return self

    def with_fastapi(self, fastapi_app: "FastAPI") -> Self:
        self.__web_provider = "fastapi"

        if not FastAPIInstrumentor:
            raise ImportError("Install using 'pip install dashfrog[fast-api]'.")

        FastAPIInstrumentor.instrument_app(
            fastapi_app,
            meter_provider=metrics.get_meter_provider(),
            http_capture_headers_server_request=["X-*, Accept*, trace*"],
            http_capture_headers_server_response=["X-*, Accept*, trace*"],
        )

        @fastapi_app.middleware("http")
        async def propagate_context(request, call_next):
            res = await call_next(request)
            propagate.inject(res.headers, context.get_current())
            return res

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
        links = [] if not link_with else [link_with]
        if (original_span := trace.get_current_span()) != INVALID_SPAN:
            links = [original_span] + links

        with self.__tracer.start_as_current_span(
            name,
            kind=trace.SpanKind.PRODUCER,
            links=[Link(link.get_span_context()) for link in links],
        ) as span:
            process = Process(name, span, self.__tracer, self.__web_provider)
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
