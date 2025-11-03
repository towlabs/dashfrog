from collections.abc import Generator, Mapping, Sequence
from contextlib import contextmanager

from .constants import BAGGAGE_FLOW_LABEL_PREFIX

from opentelemetry import baggage, context
from opentelemetry.trace import INVALID_SPAN, get_current_span


def get_labels_from_baggage(mandatory_labels: Sequence[str]) -> dict[str, str]:
    labels = {}
    for k, v in baggage.get_all().items():
        if k.startswith(BAGGAGE_FLOW_LABEL_PREFIX):
            label_key = k.removeprefix(BAGGAGE_FLOW_LABEL_PREFIX)
            labels[label_key] = v

    if missing_labels := set(mandatory_labels) - set(labels.keys()):
        raise ValueError(f"Missing mandatory labels: {missing_labels}")
    return labels


@contextmanager
def write_to_baggage(labels: Mapping[str, str]) -> Generator[None, None, None]:
    ctx = context.get_current()
    for k, v in labels.items():
        ctx = baggage.set_baggage(f"{BAGGAGE_FLOW_LABEL_PREFIX}{k}", v, context=ctx)
    token_ctx = context.attach(ctx)
    try:
        yield
    finally:
        context.detach(token_ctx)


def get_flow_id() -> str:
    span = get_current_span()
    if span == INVALID_SPAN:
        raise ValueError("No span found")
    return str(span.get_span_context().trace_id)
