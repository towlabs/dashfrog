"""FastAPI application for DashFrog SDK."""

from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from dashfrog import Config, setup
from dashfrog.api import auth_router, comment, flow, metrics, notebook

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

# Static files directory
STATIC_DIR = Path(__file__).parent / "static"


# Mount static assets
app.mount("/assets", StaticFiles(directory=STATIC_DIR / "assets"), name="assets")


@app.get("/")
async def serve_root():
    """Serve the frontend index.html at root."""
    return FileResponse(STATIC_DIR / "index.html")


@app.get("/{path:path}")
async def serve_spa(path: str):
    """Serve static files or fall back to index.html for SPA routing."""
    file_path = STATIC_DIR / path
    if file_path.is_file():
        return FileResponse(file_path)
    # Fall back to index.html for SPA client-side routing
    return FileResponse(STATIC_DIR / "index.html")

if __name__ == "__main__":
    import uvicorn

    setup(Config())

    uvicorn.run(app, host="0.0.0.0", port=8000)
