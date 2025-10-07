from collections.abc import Generator
from contextlib import contextmanager
from logging import warning
from typing import TYPE_CHECKING, Any, Self

from .core import Config, Observable, SupportedInstrumentation, clean_methods
from .flows import Context, Debug, Flow, Step

from opentelemetry import baggage, context, propagate
from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import OTLPMetricExporter
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.exporter.otlp.proto.http.metric_exporter import (
    OTLPMetricExporter as HTTPMetricExporter,
)
from opentelemetry.exporter.otlp.proto.http.trace_exporter import (
    OTLPSpanExporter as HTTPSpanExporter,
)
from opentelemetry.instrumentation.requests import RequestsInstrumentor
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics._internal.export import PeriodicExportingMetricReader
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider as SdkTracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.trace import (
    NoOpTracerProvider,
    ProxyTracerProvider,
    Span,
    TracerProvider,
    get_tracer_provider,
    set_tracer_provider,
)

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
    from opentelemetry.instrumentation.celery import CeleryInstrumentor
except ImportError:
    CeleryInstrumentor = None

try:
    from opentelemetry.instrumentation.aws_lambda import AwsLambdaInstrumentor
    from opentelemetry.instrumentation.botocore import BotocoreInstrumentor
except ImportError:
    AwsLambdaInstrumentor = None
    BotocoreInstrumentor = None

if TYPE_CHECKING:  # Only import for type checking as it could lead to import errors when not using all extra features.
    from fastapi import FastAPI
    from flask import Flask


class DashFrog:
    """DataFrog setup open telemetry tacking and provide direct entrypoints for flows."""

    __set_global_trace_provider: bool = False

    def __init__(
        self,
        service_name: str,
        config: Config | None = None,
        global_trace_provider: TracerProvider | None = None,
        **labels,
    ):
        config = config or Config()
        self.__config = config

        resource = Resource.create(
            attributes={
                **{f"label.{key}": value for key, value in labels.items()},
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
            else OTLPSpanExporter(endpoint=grpc_server, insecure=config.infra.grpc_insecure)
        )
        metric_exporter = (
            HTTPMetricExporter(endpoint=f"{http_server}/metrics")
            if config.infra.disable_grpc
            else OTLPMetricExporter(endpoint=grpc_server, insecure=config.infra.grpc_insecure)
        )

        reader = PeriodicExportingMetricReader(
            exporter=metric_exporter,
            export_interval_millis=3000,  # Export every 3 seconds
        )

        trace_provider = SdkTracerProvider(resource=resource)
        trace_provider.add_span_processor(BatchSpanProcessor(span_exporter))

        if not global_trace_provider:
            global_trace_provider = get_tracer_provider()
            if isinstance(global_trace_provider, (NoOpTracerProvider, ProxyTracerProvider)):
                warning("No global trace provider provided, creating and setting default one.")

                global_trace_provider = trace_provider
                set_tracer_provider(global_trace_provider)
                DashFrog.__set_global_trace_provider = True

        if not DashFrog.__set_global_trace_provider and hasattr(global_trace_provider, "add_span_processor"):
            global_trace_provider.add_span_processor(BatchSpanProcessor(span_exporter))  # type: ignore[reportAttributeAccessIssue]
            DashFrog.__set_global_trace_provider = True

        meter_provider = MeterProvider(metric_readers=[reader], resource=resource)

        self.__trace_provider = trace_provider
        self.__tracer = trace_provider.get_tracer("dashfrog")
        self.__meter = meter_provider.get_meter("dashfrog")

    # Features
    @contextmanager
    def flow(
        self,
        name: str,
        description: str | None = None,
        log_start: bool = False,
        log_kwargs: bool = False,
        log_context: dict[str, Any] = {},
        **labels,
    ) -> Generator[Flow, None, None]:
        """Start a new Flow of events. Use `step` to create an inside step."""

        ctx = baggage.set_baggage("flow_name", name)
        tkn = context.attach(ctx)

        with self.__tracer.start_as_current_span(name, context=ctx) as span:
            yield self.__create_flow(span, name, description, log_start, log_kwargs, log_context, **labels)

        context.detach(tkn)

    @contextmanager
    def step(
        self,
        name: str,
        description: str | None = None,
        **labels,
    ):
        """Start a new step inside the existing flow. Step does not nest with steps."""
        with self.__tracer.start_span(name) as span:
            yield Step(span, name, description, **labels)

    @contextmanager
    def context(
        self,
        name: str,
        *,
        description: str | None = None,
        debug_only: bool = False,
        **labels,
    ):
        """Create a context part."""
        if debug_only and not self.__config.debug:
            yield None
        with self.__tracer.start_span(name) as span:
            yield (
                Debug(span, name, description, **labels) if debug_only else Context(span, name, description, **labels)
            )

    def observable(
        self,
        name: str,
        description: str = "",
        unit: str = "",
        **labels,
    ) -> Observable:
        """Observe metrics. /!\\ observable metrics are identified by the name, description and unit tuple."""

        return Observable(self.__meter.create_histogram(name, unit, description), labels)

    ### Instrumentation ####
    #### Web
    def with_flask(self, flask_app: "Flask") -> Self:
        """Provide Flask application to instruments."""
        if not FlaskInstrumentor:
            raise ImportError("Install using 'pip install dashfrog[flask]'.")

        FlaskInstrumentor.instrument_app(
            flask_app,
            tracer_provider=self.__trace_provider,
            request_hook=self.__with_hook(SupportedInstrumentation.FLASK),
        )

        @flask_app.after_request
        def propagate_context(response):
            propagate.inject(response.headers, context.get_current())
            return response

        return self

    def with_fastapi(self, fastapi_app: "FastAPI") -> Self:
        """Provide FastAPI application to instruments."""
        if not FastAPIInstrumentor:
            raise ImportError("Install using 'pip install dashfrog[fast-api]'.")

        FastAPIInstrumentor.instrument_app(
            fastapi_app,
            tracer_provider=self.__trace_provider,
            server_request_hook=self.__with_hook(SupportedInstrumentation.FASTAPI),
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
            request_hook=self.__with_hook(SupportedInstrumentation.REQUESTS),
        )
        return self

    def with_httpx(self) -> Self:
        if not HTTPXClientInstrumentor:
            raise ImportError("Install using 'pip install dashfrog[httpx]'.")

        HTTPXClientInstrumentor().instrument(
            tracer_provider=self.__trace_provider,
            request_hook=self.__with_hook(SupportedInstrumentation.HTTPX),
        )
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
            request_hook=self.__with_hook(SupportedInstrumentation.CELERY),
        )
        return self

    def with_aws_lambda(self) -> Self:
        if not AwsLambdaInstrumentor or not BotocoreInstrumentor:
            raise ImportError("Install using 'pip install dashfrog[aws]'.")

        BotocoreInstrumentor().instrument(tracer_provider=self.__trace_provider)
        AwsLambdaInstrumentor().instrument(
            tracer_provider=self.__trace_provider,
            request_hook=self.__with_hook(SupportedInstrumentation.AWS_LAMBDA),
        )

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
        warning(
            f"Auto flowing instrumentation of kind `{kind}` means that the flow will replace exising flow. "
            "If your service is called by another using DashFrog flows, you'll lose traceability"
        )

        kind = f"{kind}_value"
        val = (
            getattr(self.__config.auto_flows, kind)
            if self.__config.auto_flows and hasattr(self.__config.auto_flows, kind)
            else None
        )

        label = {}
        if val:
            label[self.__config.auto_flows.label_key] = val

        def fn(span, _):
            self.__create_flow(span, clean_methods(getattr(span, "name")), **label)

        return fn

    def __create_auto_step_hook(self, kind: str):
        kind = f"{kind}_value"
        val = (
            getattr(self.__config.auto_steps, kind)
            if self.__config.auto_steps and hasattr(self.__config.auto_steps, kind)
            else None
        )

        label = {}
        if val:
            label[self.__config.auto_steps.label_key] = val

        def fn(span, _):
            Step(span, clean_methods(getattr(span, "name")), **label)

        return fn

    def __with_hook(self, kind: SupportedInstrumentation):
        if kind not in self.__config.auto_steps_instrumented:
            return None

        return self.__create_auto_step_hook(kind.group())
