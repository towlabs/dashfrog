from collections.abc import Generator
from contextlib import contextmanager
from typing import TYPE_CHECKING, Self

import clickhouse_connect

from .core import (
    Config,
    SupportedInstrumentation,
    clean_methods,
    set_singletons,
)
from .flows import Flow, Step
from .metrics import Kind, Metric, new_metric

from opentelemetry import context, propagate
from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import OTLPMetricExporter
from opentelemetry.exporter.otlp.proto.http.metric_exporter import (
    OTLPMetricExporter as HTTPMetricExporter,
)
from opentelemetry.instrumentation.requests import RequestsInstrumentor
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics._internal.export import PeriodicExportingMetricReader
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.trace import (
    INVALID_SPAN,
    NoOpTracerProvider,
    ProxyTracerProvider,
    get_current_span,
    get_tracer,
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

    def __init__(
        self,
        service_name: str,
        config: Config | None = None,
        **labels,
    ):
        config = config or Config()
        self.__config = config
        self.service_name = service_name
        self.__labels = {f"glob.{key}": value for key, value in labels.items()}

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

        metric_exporter = (
            HTTPMetricExporter(endpoint=f"{http_server}/metrics")
            if config.infra.disable_grpc
            else OTLPMetricExporter(endpoint=grpc_server, insecure=config.infra.grpc_insecure)
        )

        reader = PeriodicExportingMetricReader(
            exporter=metric_exporter,
            export_interval_millis=3000,  # Export every 3 seconds
        )

        meter_provider = MeterProvider(metric_readers=[reader], resource=resource)

        self.__meter = meter_provider.get_meter("dashfrog")

        trace_provider = get_tracer_provider()
        if isinstance(trace_provider, (NoOpTracerProvider, ProxyTracerProvider)):
            set_tracer_provider(TracerProvider(resource=resource))

        set_singletons(
            clickhouse_connect.get_client(
                host=self.__config.clickhouse.host,
                user=self.__config.clickhouse.user,
                password=self.__config.clickhouse.password,
                autogenerate_session_id=False,
            ),
            new_metric(
                self.__meter,
                Kind.COUNTER,
                "workflow_status",
                "counts occurrence of workflow end with status",
                "",
                **self.__labels,
            ),
            new_metric(
                self.__meter, Kind.STATISTIC, "workflow_duration", "counts duration of workflow", "ms", **self.__labels
            ),
            new_metric(
                self.__meter,
                Kind.COUNTER,
                "step_status",
                "counts occurrence of step end with status",
                "",
                **self.__labels,
            ),
            new_metric(self.__meter, Kind.STATISTIC, "step_duration", "counts duration of step", "ms", **self.__labels),
        )

    # Features
    @contextmanager
    def flow(
        self,
        name: str,
        description: str | None = None,
        auto_end: bool = True,
        **labels,
    ) -> Generator[Flow, None, None]:
        """Start a new Flow of events. Use `step` to create an inside step."""

        span = get_current_span()
        if span == INVALID_SPAN:
            with get_tracer("dashfrog").start_as_current_span(name) as span:
                with Flow(
                    name,
                    self.service_name,
                    description,
                    auto_end=auto_end,
                    **{**labels, **self.__labels},
                ) as flow:
                    yield flow
        else:
            with Flow(
                name,
                self.service_name,
                description,
                auto_end=auto_end,
                **{**labels, **self.__labels},
            ) as flow:
                yield flow

    @contextmanager
    def step(
        self,
        name: str,
        description: str | None = None,
        auto_start: bool = True,
        auto_end: bool = True,
        **labels,
    ):
        """Start a new step inside the existing flow. Step does not nest with steps."""

        span = get_current_span()
        if span == INVALID_SPAN:
            with get_tracer("dashfrog").start_as_current_span(name) as span:
                with Step(
                    name,
                    description,
                    auto_end=auto_end,
                    auto_start=auto_start,
                    **{**labels, **self.__labels},
                ) as step:
                    yield step
        else:
            with Step(
                name,
                description,
                auto_end=auto_end,
                auto_start=auto_start,
                **{**labels, **self.__labels},
            ) as step:
                yield step

    @contextmanager
    def current_flow(
        self,
        auto_end: bool = True,
    ) -> Generator[Flow, None, None]:
        """Start a new Flow of events. Use `step` to create an inside step."""
        with Flow("", self.service_name, auto_end=auto_end, from_context=True) as flow:
            yield flow

    @contextmanager
    def current_step(
        self,
        auto_start: bool = True,
        auto_end: bool = True,
    ):
        """Start a new step inside the existing flow. Step does not nest with steps."""
        with Step("", auto_end=auto_end, auto_start=auto_start, from_context=True) as step:
            yield step

    def metrics(
        self,
        kind: Kind,
        name: str,
        description: str = "",
        unit: str = "",
        **labels,
    ) -> Metric:
        """Observe metrics. /!\\ observable metrics are identified by the name, description and unit tuple."""

        return new_metric(self.__meter, kind, name, description, unit, **labels)

    ### Instrumentation ####
    #### Web
    def with_flask(self, flask_app: "Flask") -> Self:
        """Provide Flask application to instruments."""
        if not FlaskInstrumentor:
            raise ImportError("Install using 'pip install dashfrog[flask]'.")

        FlaskInstrumentor.instrument_app(
            flask_app,
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
            request_hook=self.__with_hook(SupportedInstrumentation.REQUESTS),
        )
        return self

    def with_httpx(self) -> Self:
        if not HTTPXClientInstrumentor:
            raise ImportError("Install using 'pip install dashfrog[httpx]'.")

        HTTPXClientInstrumentor().instrument(
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
            request_hook=self.__with_hook(SupportedInstrumentation.CELERY),
        )
        return self

    def with_aws_lambda(self) -> Self:
        if not AwsLambdaInstrumentor or not BotocoreInstrumentor:
            raise ImportError("Install using 'pip install dashfrog[aws]'.")

        BotocoreInstrumentor().instrument()
        AwsLambdaInstrumentor().instrument(
            request_hook=self.__with_hook(SupportedInstrumentation.AWS_LAMBDA),
        )

        return self

    # Private tooling
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
            Step(clean_methods(getattr(span, "name")), **label)

        return fn

    def __with_hook(self, kind: SupportedInstrumentation):
        if kind not in self.__config.auto_steps_instrumented:
            return None

        return self.__create_auto_step_hook(kind.group())
