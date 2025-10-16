"""Health check endpoint for Kubernetes liveness and readiness probes."""

from fastapi import APIRouter

ep = APIRouter(prefix="/health", tags=["health"])


@ep.get("")
async def health_check():
    """
    Health check endpoint for Kubernetes probes.

    Returns a simple OK response to indicate the service is running.
    """
    return {"status": "ok"}
