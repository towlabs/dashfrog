"""
DashFrog Python SDK - Business Observability on OpenTelemetry

Usage:
    from dashfrog_python_sdk import setup, Config
    from dashfrog_python_sdk.flow import start as flow_start
    from dashfrog_python_sdk.step import start as step_start
    from dashfrog_python_sdk.metric import count, total, measure

    # Initialize
    setup(Config(
        otel_endpoint="localhost:4317",
        postgres_host="localhost",
        postgres_dbname="dashfrog",
    ))

    # Track business flows
    with flow_start("process_order", customer_id="123"):
        with step_start("validate"):
            # ... work
            pass

    # Track metrics
    orders = count("orders_placed", "count", labels=["region"])
    orders.increment(region="us-east")
"""

__version__ = "0.1.0"

# Core setup and configuration
# Submodules (users import from these)
from . import event, flow, metric, step
from .config import Config
from .dashfrog import Dashfrog, get_dashfrog_instance, setup

# Instrumentation helpers (optional convenience)
with_fastapi = Dashfrog.with_fastapi
with_flask = Dashfrog.with_flask
with_requests = Dashfrog.with_requests
with_httpx = Dashfrog.with_httpx
with_celery = Dashfrog.with_celery
with_aws_lambda = Dashfrog.with_aws_lambda

__all__ = [
    # Version
    "__version__",
    # Setup
    "setup",
    "get_dashfrog_instance",
    "Config",
    "Dashfrog",
    # Submodules
    "event",
    "flow",
    "step",
    "metric",
    # Instrumentation
    "with_fastapi",
    "with_flask",
    "with_requests",
    "with_httpx",
    "with_celery",
    "with_aws_lambda",
]
