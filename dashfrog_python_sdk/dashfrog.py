from contextlib import contextmanager
from typing import TYPE_CHECKING, Any, Generator, Self

from .core import Config, Observable, clean_methods
from .flows import Debug, Flow, TechContext

from opentelemetry import context, propagate, trace
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

try:
    from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor
except ImportError:
    SQLAlchemyInstrumentor = None

try:
    from opentelemetry.instrumentation.celery import CeleryInstrumentor
except ImportError:
    CeleryInstrumentor = None
try:
    from opentelemetry.instrumentation.pymongo import PymongoInstrumentor
except ImportError:
    PymongoInstrumentor = None
try:
    from opentelemetry.instrumentation.openai import OpenAIInstrumentor
except ImportError:
    OpenAIInstrumentor = None

if TYPE_CHECKING:  # Only import for type checking as it could lead to import errors when not using all extra features.
    from fastapi import FastAPI
    from flask import Flask
    from sqlalchemy import Engine

propagate.set_global_textmap(
    CompositePropagator([TraceContextTextMapPropagator(), W3CBaggagePropagator()])
)


class DashFrog:
    """DataFrog setup open telemetry tacking and provide direct entrypoints for flows."""

    def __init__(self, service_name: str, config: Config | None = None, **labels):
        config = config or Config()
        self.__config = config

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

        trace_provider = TracerProvider(resource=resource)
        trace_provider.add_span_processor(BatchSpanProcessor(span_exporter))
        meter_provider = MeterProvider(metric_readers=[reader], resource=resource)

        self.__trace_provider = trace_provider
        self.__tracer = trace_provider.get_tracer(__name__)
        self.__meter = meter_provider.get_meter(__name__)

    # Features
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

    @contextmanager
    def tech_context(
        self,
        name: str,
        *,
        description: str | None = None,
        debug_only: bool = False,
        **labels,
    ):
        """Create tech only context part.."""
        if debug_only and not self.__config.debug:
            yield None
        with self.__tracer.start_span(name) as span:
            yield (
                Debug(span, name, description, **labels)
                if debug_only
                else TechContext(span, name, description, **labels)
            )

    def observable(
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

    # def event(self, name: str, description: str | None = None, **labels) -> Self:
    #     """
    #     Add event to the latest known flow. If no flow exists, the event will be ignored.
    #     To ensure event is related to the flow you defined, you should use the `flow` context manager
    #     `event` method.
    #     """
    #
    #     if (span := trace.get_current_span()) != INVALID_SPAN:
    #         if description:
    #             labels["description"] = description
    #
    #         span.add_event(name, labels)
    #
    #     return self

    ### Instrumentations ####
    #### Web
    def with_flask(self, flask_app: "Flask") -> Self:
        """Provide Flask application to instrument."""
        if not FlaskInstrumentor:
            raise ImportError("Install using 'pip install dashfrog[flask]'.")

        FlaskInstrumentor.instrument_app(
            flask_app,
            tracer_provider=self.__trace_provider,
            request_hook=self.__create_flow_hook("web")
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
        if not FastAPIInstrumentor:
            raise ImportError("Install using 'pip install dashfrog[fast-api]'.")

        FastAPIInstrumentor.instrument_app(
            fastapi_app,
            tracer_provider=self.__trace_provider,
            server_request_hook=self.__create_flow_hook("web")
            if self.__config.auto_flow_instrumented
            else None,
        )

        @fastapi_app.middleware("http")
        async def propagate_context(request, call_next):
            res = await call_next(request)
            propagate.inject(res.headers, context.get_current())
            return res

        return self

    def with_requests(self) -> Self:
        RequestsInstrumentor().instrument(
            tracer_provider=self.__trace_provider,
            request_hook=self.__create_flow_hook("http")
            if self.__config.auto_flow_instrumented
            else None,
        )
        return self

    def with_httpx(self) -> Self:
        if not HTTPXClientInstrumentor:
            raise ImportError("Install using 'pip install dashfrog[httpx]'.")

        HTTPXClientInstrumentor().instrument(
            tracer_provider=self.__trace_provider,
            request_hook=self.__create_flow_hook("http")
            if self.__config.auto_flow_instrumented
            else None,
        )
        return self

    ### DB
    def with_sqlalchemy(self, engine: "Engine") -> Self:
        if not SQLAlchemyInstrumentor:
            raise ImportError("Install using 'pip install dashfrog[sqlalchemy]'.")

        SQLAlchemyInstrumentor().instrument(
            tracer_provider=self.__trace_provider, engine=engine
        )
        return self

    def with_mongo_db(self):
        if not PymongoInstrumentor:
            raise ImportError("Install using 'pip install dashfrog[sqlalchemy]'.")

        PymongoInstrumentor().instrument(tracer_provider=self.__trace_provider)
        return self

    ### Queue services
    def with_celery(self) -> Self:
        """This call must be made after processes are fully initialized as stated in:
        https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/celery/celery.html#setting-up-tracing
        You can use the decorator `@worker_process_init.connect(weak=False)`
        to do so."""
        if not CeleryInstrumentor:
            raise ImportError("Install using 'pip install dashfrog[celery]'.")

        CeleryInstrumentor().instrument(
            tracer_provider=self.__trace_provider,
            request_hook=self.__create_flow_hook("tasks")
            if self.__config.auto_flow_instrumented
            else None,
        )
        return self

    def with_open_ai(self):
        if not OpenAIInstrumentor:
            raise ImportError("Install using 'pip install dashfrog[openai]'.")

        OpenAIInstrumentor().instrument(tracer_provider=self.__trace_provider)
        return self

    # Private tooling
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
        flow = Flow(span, self.__tracer, name, description, **labels)
        if log_start:
            ctx = {"name": name, **log_context}
            if log_kwargs:
                ctx.update(labels)

            span.add_event("process.start", ctx)

        return flow

    def __create_flow_hook(self, kind: str):
        kind = f"{kind}_value"
        val = (
            getattr(self.__config.auto_flow, kind)
            if self.__config.auto_flow and hasattr(self.__config.auto_flow, kind)
            else None
        )

        label = {}
        if val:
            label[self.__config.auto_flow.label_key] = val

        def fn(span, _):
            return self.__create_flow(
                span, clean_methods(getattr(span, "name")), **label
            )

        return fn
