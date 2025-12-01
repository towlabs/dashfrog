"""Shared constants for DashFrog SDK."""

from typing import Literal

# Baggage keys
BAGGAGE_FLOW_LABEL_PREFIX = "dashfrog.flow."
BAGGAGE_FLOW_LABEL_NAME = "flow_name"
BAGGAGE_STEP_LABEL_NAME = "step_name"

# Event names
EVENT_FLOW_START = "flow_start"
EVENT_FLOW_SUCCESS = "flow_success"
EVENT_FLOW_FAIL = "flow_fail"
EVENT_STEP_START = "step_start"
EVENT_STEP_SUCCESS = "step_success"
EVENT_STEP_FAIL = "step_fail"
TENANT_LABEL_NAME = "tenant"


# Types
MetricUnitT = Literal["percent"] | str | None

DEFAULT_THRESHOLD_DAYS = 30
