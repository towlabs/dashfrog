from http import HTTPStatus

from fastapi import FastAPI, Request
from starlette.responses import JSONResponse

from src import router
from src.backend import Application

# Initialize Tower application
app = Application()


api = FastAPI(name="Dashfrog backend", version=app.configuration.release)

# Use the application's logger
logger = app.logger


# Add exception handler
@api.exception_handler(Exception)
async def global_exception_handler(request: Request, _: Exception):
    logger.error(
        "Unhandled exception occurred",
        exc_info=True,
        extra={
            "request_id": request.state.request_id
            if hasattr(request, "state")
            else None,
            "app_version": request.state.app_version
            if hasattr(request, "state")
            else None,
            "path": request.url.path,
            "method": request.method,
            "query_params": dict(request.query_params),
            "headers": dict(request.headers),
        },
    )
    return JSONResponse(
        status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
        content={"detail": "An internal server error occurred"},
    )


# Include routers
api.include_router(router, prefix="/api")

# For development only
if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:api", host="0.0.0.0", port=8080, reload=True)  # nosec
