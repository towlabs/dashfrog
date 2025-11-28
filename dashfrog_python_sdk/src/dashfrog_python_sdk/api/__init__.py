"""FastAPI application for DashFrog SDK."""

from fastapi import FastAPI

from dashfrog_python_sdk import Config, setup
from dashfrog_python_sdk.api import auth_router, comment, flow, metrics, notebook

app = FastAPI(
    title="DashFrog API",
    description="API for DashFrog observability SDK",
    version="0.1.0",
)

# Include routers
app.include_router(auth_router.router)  # Auth routes (login)
app.include_router(comment.router)
app.include_router(flow.router)
app.include_router(metrics.router)
app.include_router(notebook.router)

if __name__ == "__main__":
    import uvicorn

    setup(Config())

    uvicorn.run(app, host="0.0.0.0", port=8000)
