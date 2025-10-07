import logging

from axiom_py import Client
from axiom_py.structlog import AxiomProcessor
import structlog
from structlog import BoundLogger
from structlog.processors import CallsiteParameter


def setup_logging(
    client: Client,
    log_level: int = logging.INFO,
    env: str = "prod",
    with_axiom: bool = False,
) -> BoundLogger:
    """
    Set up logging configuration with Axiom handler and global exception handling.

    Args:
        client: Axiom client instance
        log_level: The logging level (default: INFO)
        env: execution environment (default: prod)
    """
    processors = [
        structlog.contextvars.merge_contextvars,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.add_log_level,
        structlog.processors.StackInfoRenderer(),
        structlog.processors.CallsiteParameterAdder(
            [
                CallsiteParameter.FILENAME,
                CallsiteParameter.PATHNAME,
                CallsiteParameter.FUNC_NAME,
                CallsiteParameter.LINENO,
                CallsiteParameter.MODULE,
            ],
        ),
        structlog.dev.set_exc_info,
        structlog.processors.TimeStamper(fmt="iso", key="_time", utc=True),
    ]

    if with_axiom:
        processors.append(
            AxiomProcessor(client, "dashfrog-backend"),
        )

    if env in ("dev", "local", "container"):
        processors.append(structlog.dev.ConsoleRenderer())

    structlog.configure(
        processors=processors,
        wrapper_class=structlog.make_filtering_bound_logger(log_level),
        context_class=dict,
        logger_factory=structlog.PrintLoggerFactory(),
        cache_logger_on_first_use=False,
    )

    logger = logging.getLogger("tower")
    logger.setLevel(log_level)
    struct_logger = structlog.wrap_logger(logger)

    return struct_logger
