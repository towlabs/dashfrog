"""
Doc module ?
"""

from logging import DEBUG

import structlog
from structlog.processors import CallsiteParameter

from .core import Config
from .dashfrog import DashFrog
from .flows import Flow

processors = [
    structlog.processors.add_log_level,
    structlog.processors.StackInfoRenderer(),
    structlog.dev.set_exc_info,
    structlog.processors.TimeStamper(fmt="iso", key="_time", utc=True),
    structlog.dev.ConsoleRenderer(),
]


structlog.configure(
    processors=processors,
    wrapper_class=structlog.make_filtering_bound_logger(DEBUG),
    context_class=dict,
    logger_factory=structlog.PrintLoggerFactory(),
    cache_logger_on_first_use=False,
)

__all__ = ["DashFrog", "Config", "Flow"]
__version__ = "0.1.0"
