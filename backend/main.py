from http import HTTPStatus
import time
from uuid import uuid4

from fastapi import FastAPI, Request
from starlette.middleware.cors import CORSMiddleware
from starlette.responses import JSONResponse

from app import Application

app = Application()

api = FastAPI(name="Dashfrog backend", version=app.configuration.release)


logger = app.logger


@api.exception_handler(Exception)
async def global_exception_handler(request: Request, e: Exception):
    return JSONResponse(
        status_code=HTTPStatus.INTERNAL_SERVER_ERROR,
        content={"detail": "An internal server error occurred"},
    )


@api.middleware("http")
async def log_requests(request: Request, call_next):
    request_id = request.headers.get("x-request-id", uuid4().__str__())
    app_version = request.headers.get("x-app-version", "demo")

    request.state.request_id = request_id
    request.state.app_version = app_version

    log = logger.bind(
        request_id=request_id,
        app_version=app_version,
        path=request.url.path,
        method=request.method,
        query_params=dict(request.query_params),
        headers=dict(request.headers),
        client_host=request.client.host if request.client else None,
    )

    # Start timer
    start_time = time.time()

    # Log request
    try:
        log.info("Incoming request")
    except Exception as e:
        print(e)
    try:
        # Process request
        response = await call_next(request)

        # Calculate duration
        duration = time.time() - start_time

        # Log response
        log.bind(duration_ms=round(duration * 1000, 2)).info("Request completed")

        response.headers.append("X-Request-ID", request_id)

        return response
    except Exception:
        # Calculate duration even if there was an error
        duration = time.time() - start_time

        # Log error
        log.bind(duration_ms=round(duration * 1000, 2)).error(
            "Request failed",
            exc_info=True,
        )
        raise


api.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


api.include_router(app.init_web(), prefix="/api")

# For development only
if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:api", host="0.0.0.0", port=8080, reload=True)  # nosec
