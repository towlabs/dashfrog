"""API routes for the application."""

from .events import router as events_router
from .flows import router as flows_router
from .health import router as health_router
from .labels import router as labels_router
from .metrics import router as metrics_router
from .notebook import router as notebook_router

__all__ = [
    "events_router",
    "flows_router",
    "health_router",
    "labels_router",
    "metrics_router",
    "notebook_router",
]
