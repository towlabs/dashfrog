"""Health check endpoint for Kubernetes liveness and readiness probes."""

from fastapi import APIRouter

router = APIRouter(prefix="/health", tags=["health"])


@router.get("")
async def health_check():
    """
    Health check endpoint for Kubernetes probes.

    Returns a simple OK response to indicate the service is running.
    """
    return {"status": "ok"}
