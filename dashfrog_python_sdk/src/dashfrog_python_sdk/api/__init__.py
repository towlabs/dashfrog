"""FastAPI application for DashFrog SDK."""

from fastapi import FastAPI

from . import flow, metrics, timeline

app = FastAPI(
    title="DashFrog API",
    description="API for DashFrog observability SDK",
    version="0.1.0",
)

# Include routers
app.include_router(flow.router)
app.include_router(metrics.router)
app.include_router(timeline.router)
