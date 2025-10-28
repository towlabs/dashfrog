"""Helper functions for models and routes."""

from re import compile

from core.stringcase import titlecase
from models.facets import MetricKind

# Technical label mappings for better product/user-friendly display names
TECHNICAL_LABEL_DISPLAY_NAMES = {
    "http_host": "Resource Address",
    "http_method": "Request Type",
    "http_scheme": "Security Protocol",
    "http_server_name": "Server Name",
    "http_status_code": "Response Status",
    "http_target": "URL Path",
}

# Known Prometheus units for metric parsing
KNOWN_PROM_UNITS = {
    "seconds",
    "milliseconds",
    "microseconds",
    "nanoseconds",
    "bytes",
    "kilobytes",
    "megabytes",
    "gigabytes",
    "ratio",
    "percent",
    "count",
    "requests",
}

# Metric name parsing regex
metric_name_parsing = compile(
    r"^(?:dashfrog_internal_(?P<scope>[^_]+)_|dashfrog_user_(?P<custom>[^_]+)_)?"
    r"(?P<name>.+?)"
    r"(?:_(?P<kind>measure|stats|counter))?"
    r"(?:_(?P<unit>(?!total$|sum$|count$|bucket$|buckets$)[^_]+))?"
    r"(?:_(?P<promsuffix>total|sum|count|bucket|buckets))?$"
)


def get_label_display_name(label_key: str) -> str:
    """
    Get a human-friendly display name for a label.

    For technical labels (e.g., http_*, exported_job), returns a predefined
    human-readable name. Otherwise, returns the titlecased version of the label.
    """
    return TECHNICAL_LABEL_DISPLAY_NAMES.get(label_key, titlecase(label_key))


def parse_prom_name(metric_name: str):
    """Parse a Prometheus metric name into its components."""
    if not (matches := metric_name_parsing.match(metric_name)):
        return None

    name = matches.group("name")
    kind = MetricKind(matches.group("kind") or "other")
    df_scope = matches.group("scope")
    usr_scope = matches.group("custom")
    unit = matches.group("unit")

    if (kind is None or kind == MetricKind.other) and unit not in KNOWN_PROM_UNITS:
        # If no kind and unit is not in Prometheus known units → not a real unit
        name = "_".join(filter(None, [name, unit]))
        unit = None
    elif kind is not None and unit in {
        "total",
        "sum",
        "count",
        "bucket",
        "buckets",
    }:
        # Safety: drop special Prom suffixes if misparsed
        unit = None

    return name, kind, (usr_scope or df_scope), unit
