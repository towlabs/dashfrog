from collections.abc import Generator
from contextlib import AbstractContextManager, contextmanager
from datetime import UTC, datetime
from logging import warning
from types import TracebackType
from typing import Any

import shortuuid
from structlog import get_logger

from . import entities, stores, time
from .core import get_step_duration, get_step_status, get_workflow_duration, get_workflow_status

from opentelemetry import baggage, context
from opentelemetry.trace import get_current_span, get_tracer
from opentelemetry.trace.span import INVALID_SPAN


class BaseSpan(AbstractContextManager):
    name: str
    identifier: str
    initialized: bool = False

    _kind: str
    _store: stores.AbstractStore

    def __init__(
        self,
        entity: entities.Base,
        identifier: str,
        initialized: bool = False,
        auto_start: bool = True,
        auto_end: bool = True,
    ) -> None:
        entity.labels = {key: str(val) for key, val in entity.labels.items()}
        self.name = entity.name
        self.identifier = identifier
        self.initialized = initialized

        self.__auto_end = auto_end
        self.__auto_start = auto_start
        self.__ctx_token: Any = None
        self.__entity = entity

    def __enter__(self):
        """Return `self` upon entering the runtime context."""

        if not self.initialized:
            ctx = baggage.set_baggage(
                f"current_{self._kind}_id",
                self.identifier,
                baggage.set_baggage(f"current_{self._kind}", self.name),
            )
            self.__ctx_token = context.attach(ctx)

        logger = get_logger(
            kind=self._kind,
            name=self.name,
            attached_context=baggage.get_all(),
            trace_id=self.__entity.trace_id,
            initialized=self.initialized,
        )

        if not self.initialized:
            logger.info(
                f"creating object {self._kind}::{self.name}",
                kind=self._kind,
                name=self.name,
            )

            self._store.insert(self.__entity)
            self.initialized = True

        if self.__auto_start and self.__entity.status in (
            entities.Status.WAITING,
            entities.Status.UNSET,
        ):
            logger.info(
                f"starting object {self._kind}::{self.name}",
                kind=self._kind,
                name=self.name,
            )
            if self.__entity.started_at is None:
                self.__entity.started_at = datetime.now(UTC)

            self.__entity.status = entities.Status.UNSET
            self._store.insert(self.__entity)
            self.__observe()

        return self

    def __exit__(
        self,
        exc_type: type[BaseException] | None,
        exc_value: BaseException | None,
        traceback: TracebackType | None,
    ):
        """Raise any exception triggered within the runtime context."""
        logger = get_logger(kind=self._kind, name=self.name, attached_context=baggage.get_all())

        if self.__auto_end or exc_value is not None:
            self.__entity.ended_at = datetime.now(UTC)
            if self.__entity.started_at:
                self.__entity.duration = int(
                    (
                        time.Converts.to_utc(self.__entity.ended_at) - time.Converts.to_utc(self.__entity.started_at)
                    ).total_seconds()
                    * 1000
                )

            if exc_value is not None:
                logger.error(f"ending object {self._kind}::{self.name} with error")  # , exc_info=exc_value)
                self.__entity.status = entities.Status.FAILED
                self.__entity.status_message = str(exc_value)
            else:
                logger.info(
                    f"ending object  {self._kind}::{self.name}",
                    kind=self._kind,
                    name=self.name,
                )
                self.__entity.status = entities.Status.SUCCESS

            self._store.insert(self.__entity)
            self.__observe()

        if self.__ctx_token:
            context.detach(self.__ctx_token)

        return None

    def __observe(self):
        if self._kind == "step":
            get_step_status().observe(1, status=self.__entity.status, step=self.name)
            if self.__entity.duration is not None:
                get_step_duration().observe(self.__entity.duration, step=self.name)
        if self._kind == "flow":
            get_workflow_status().observe(1, status=self.__entity.status, step=self.name)
            if self.__entity.duration is not None:
                get_workflow_duration().observe(self.__entity.duration, step=self.name)

    def __repr__(self) -> str:
        return f"{self.__class__.__name__}({self.name!r})"


class Flow(BaseSpan):
    """Flow is a thread of events happening during a watched process."""

    name: str
    _kind = "flow"
    _store = stores.Flows()

    def __init__(
        self,
        name: str,
        service_name: str,
        description: str | None = None,
        auto_end: bool = True,
        from_context: bool = False,
        **labels,
    ):
        def __init():
            current_baggage = baggage.get_all()
            trace_id = str(span.get_span_context().trace_id)

            if from_context:
                _flow = self._store.get_by_id(
                    str(current_baggage.get(f"current_{Flow._kind}_id", "")),
                    trace_id,
                    "created_at",
                    "started_at",
                    "ended_at",
                    "status",
                    "labels",
                    "duration",
                )

            else:
                src_flow = current_baggage.get(f"current_{Flow._kind}_id")
                if src_flow:
                    labels[f"{self._kind}.src.name"] = str(src_flow)
                    warning(f"Flow must not be nested. {name} => {src_flow}")

                _flow = entities.Flow(
                    name=name,
                    service_name=service_name,
                    description=description,
                    trace_id=trace_id,
                    created_at=datetime.now(UTC),
                    labels=labels,
                )

            return _flow

        span = get_current_span()
        flow = __init()

        super().__init__(
            flow,
            flow.name,
            auto_end=auto_end,
            initialized=from_context,
            auto_start=(not from_context),
        )

    @contextmanager
    def step(self, name: str, description: str | None = None, **labels) -> Generator["Step", None, None]:
        """Start a child flow"""

        with Step(name, description, **labels) as step:
            yield step


class Step(BaseSpan):
    _kind = "step"
    _store = stores.Steps()

    def __init__(
        self,
        name,
        description: str | None = None,
        auto_start: bool = True,
        auto_end: bool = True,
        from_context: bool = False,
        **labels,
    ):
        def __init():
            trace_id = str(span.get_span_context().trace_id)
            current_baggage = baggage.get_all()
            src_flow = str(current_baggage.get(f"current_{Flow._kind}_id"))

            if from_context:
                _step = self._store.get_by_id(
                    str(current_baggage.get(f"current_{Step._kind}_id", "")),
                    trace_id,
                    "name",
                    "created_at",
                    "started_at",
                    "ended_at",
                    "status",
                    "labels",
                    "duration",
                )

                _step.created_at = datetime.now(UTC)
            else:
                src_step_id = current_baggage.get(f"current_{self._kind}_id")

                _step = entities.Step(
                    id=shortuuid.uuid(),
                    for_flow=src_flow,
                    parent_id=str(src_step_id) if src_step_id else None,
                    name=name,
                    description=description,
                    status=entities.Status.WAITING,
                    trace_id=trace_id,
                    labels=labels,
                )

            return _step

        span = get_current_span()
        if span == INVALID_SPAN:
            with get_tracer("dashfrog").start_as_current_span(name) as span:
                get_logger(
                    kind="step",
                    name=name,
                    trace_id=str(span.get_span_context().trace_id),
                ).error("no current span")
                step = __init()
        else:
            step = __init()

        super().__init__(
            step,
            step.id,
            auto_start=auto_start,
            auto_end=auto_end,
            initialized=from_context,
        )
