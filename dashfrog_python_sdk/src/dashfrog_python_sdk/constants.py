"""Shared constants for DashFrog SDK."""

# Baggage keys
BAGGAGE_FLOW_NAME = "dashfrog.flow.name"
BAGGAGE_FLOW_LABEL_PREFIX = "dashfrog.flow.label."
BAGGAGE_STEP_NAME = "dashfrog.step.name"

# Table name
TABLE_EVENTS = "dashfrog_events"

# Event names
EVENT_FLOW_START = "flow_start"
EVENT_FLOW_SUCCESS = "flow_success"
EVENT_FLOW_FAIL = "flow_fail"
EVENT_STEP_START = "step_start"
EVENT_STEP_SUCCESS = "step_success"
EVENT_STEP_FAIL = "step_fail"
