from contextlib import contextmanager
from functools import wraps
from inspect import signature
from typing import TYPE_CHECKING, Any, Generator, Self

from .core import Config, Observable
from .flows import Flow

from opentelemetry import context, metrics, propagate, trace
from opentelemetry.baggage.propagation import W3CBaggagePropagator
from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import OTLPMetricExporter
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.exporter.otlp.proto.http.metric_exporter import (
    OTLPMetricExporter as HTTPMetricExporter,
)
from opentelemetry.exporter.otlp.proto.http.trace_exporter import (
    OTLPSpanExporter as HTTPSpanExporter,
)
from opentelemetry.instrumentation.requests import RequestsInstrumentor
from opentelemetry.propagators.composite import CompositePropagator
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics._internal.export import PeriodicExportingMetricReader
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.trace import INVALID_SPAN, Span
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


if TYPE_CHECKING:  # Only import for type checking as it could lead to import errors when not using all extra features.
    from fastapi import FastAPI
    from flask import Flask

propagate.set_global_textmap(
    CompositePropagator([TraceContextTextMapPropagator(), W3CBaggagePropagator()])
)


class DashFrog:
    """DataFrog setup open telemetry tacking and provide direct entrypoints for flows."""

    __web_provider: str | None

    def __init__(self, service_name: str, **labels):
        config = Config()
        self.__config = config

        self.__web_provider = None

        resource = Resource.create(
            attributes={
                **labels,
                "service.name": service_name,
                "service.provider": "tower.dashfrog",
                "dashfrog.version": "alpha",
            }
        )

        http_server = f"{config.collector_server}:{config.infra.http_collector_port}/v1"
        grpc_server = f"{config.collector_server}:{config.infra.grpc_collector_port}"

        span_exporter = (
            HTTPSpanExporter(endpoint=f"{http_server}/traces")
            if config.infra.disable_grpc
            else OTLPSpanExporter(
                endpoint=grpc_server, insecure=config.infra.grpc_insecure
            )
        )
        metric_exporter = (
            HTTPMetricExporter(endpoint=f"{http_server}/metrics")
            if config.infra.disable_grpc
            else OTLPMetricExporter(
                endpoint=grpc_server, insecure=config.infra.grpc_insecure
            )
        )

        reader = PeriodicExportingMetricReader(
            exporter=metric_exporter,
            export_interval_millis=3000,  # Export every 3 seconds
        )

        trace.set_tracer_provider(TracerProvider(resource=resource))
        metrics.set_meter_provider(
            MeterProvider(metric_readers=[reader], resource=resource)
        )

        trace.get_tracer_provider().add_span_processor(
            BatchSpanProcessor(span_exporter)
        )

        self.__tracer = trace.get_tracer(__name__)
        self.__meter = metrics.get_meter(__name__)

        RequestsInstrumentor().instrument(request_hook=self.__create_flow_hok)
        if HTTPXClientInstrumentor:
            HTTPXClientInstrumentor().instrument(request_hook=self.__create_flow_hook)

    def with_flask(self, flask_app: "Flask") -> Self:
        """Provide Flask application to instrument."""
        self.__web_provider = "flask"

        if not FlaskInstrumentor:
            raise ImportError("Install using 'pip install dashfrog[flask]'.")

        FlaskInstrumentor.instrument_app(
            flask_app,
            request_hook=self.__create_flow_hook
            if self.__config.auto_flow_instrumented
            else None,
        )

        @flask_app.after_request
        def propagate_context(response):
            propagate.inject(response.headers, context.get_current())
            return response

        return self

    def with_fastapi(self, fastapi_app: "FastAPI") -> Self:
        """Provide FastAPI application to instrument."""
        self.__web_provider = "fastapi"

        if not FastAPIInstrumentor:
            raise ImportError("Install using 'pip install dashfrog[fast-api]'.")

        FastAPIInstrumentor.instrument_app(
            fastapi_app,
            server_request_hook=self.__create_flow_hook
            if self.__config.auto_flow_instrumented
            else None,
        )

        @fastapi_app.middleware("http")
        async def propagate_context(request, call_next):
            res = await call_next(request)
            propagate.inject(res.headers, context.get_current())
            return res

        return self

    @contextmanager
    def new_flow(
        self,
        name: str,
        *,
        description: str | None = None,
        log_start: bool = False,
        log_kwargs: bool = False,
        log_context: dict[str, Any] = {},
        **labels,
    ) -> Generator[Flow, None, None]:
        """Start a new root Flow of events. Existing flows will be closed."""

        with self.__tracer.start_as_current_span(name, links=[]) as span:
            yield self.__create_flow(
                span, name, description, log_start, log_kwargs, log_context, **labels
            )

    @contextmanager
    def flow(
        self,
        name: str,
        *,
        description: str | None = None,
        log_start: bool = False,
        log_kwargs: bool = False,
        log_context: dict[str, Any] = {},
        **labels,
    ):
        """Start a new flow if none exists, otherwise create a child flow."""
        if trace.get_current_span() != INVALID_SPAN:
            with self.new_flow(
                name,
                description=description,
                log_start=log_start,
                log_kwargs=log_kwargs,
                log_context=log_context,
                **labels,
            ) as flow:
                yield flow
        else:
            with self.__tracer.start_span(name) as span:
                yield self.__create_flow(
                    span,
                    name,
                    description,
                    log_start,
                    log_kwargs,
                    log_context,
                    **labels,
                )

    def as_flow(
        self,
        name: str,
        description: str | None = None,
        log_start: bool = False,
        log_kwargs: bool = False,
        log_context: dict[str, Any] = {},
        **labels,
    ):
        """
        Decorates methods to start a new flow on each call.
        Flow is provided as `flow` in method arguments if available.
        """

        def decorator(func):
            sig = signature(func)
            with_flow = "flow" in sig.parameters or "kwargs" in sig.parameters

            @wraps(func)
            def wrapper(*args, **kwargs):
                gen_flow = (
                    self.flow
                    if trace.get_current_span() != INVALID_SPAN
                    else self.new_flow
                )
                with gen_flow(
                    name,
                    description=description,
                    log_start=log_start,
                    log_kwargs=log_kwargs,
                    log_context=log_context,
                    **labels,
                ) as flow:
                    if with_flow:
                        return func(*args, flow=flow, **kwargs)

                    return func(*args, **kwargs)

            return wrapper

        return decorator

    def observe(
        self,
        name: str,
        description: str = "",
        unit: str = "",
        **labels,
    ) -> Observable:
        """Observe metrics. /!\\ observable metrics are identified by the name, description and unit tuple."""

        return Observable(
            self.__meter.create_histogram(name, unit, description), labels
        )

    def event(self, name: str, description: str | None = None, **labels) -> Self:
        """
        Add event to the latest known flow. If no flow exists, the event will be ignored.
        To ensure event is related to the flow you defined, you should use the `flow` context manager
        `event` method.
        """

        if (span := trace.get_current_span()) != INVALID_SPAN:
            if description:
                labels["description"] = description

            span.add_event(name, labels)

        return self

    def __create_flow(
        self,
        span: Span,
        name: str,
        description: str | None = None,
        log_start: bool = False,
        log_kwargs: bool = False,
        log_context: dict[str, Any] = {},
        **labels,
    ):
        flow = Flow(span, self.__tracer, name, description, self.__web_provider)
        if log_start:
            ctx = {"name": name, **log_context}
            if log_kwargs:
                ctx.update(labels)

            span.add_event("process.start", ctx)

        for key, value in labels.items():
            span.set_attribute(key, value)

        return flow

    def __create_flow_hook(self, span, _):
        self.__create_flow(span, getattr(span, "name"))
