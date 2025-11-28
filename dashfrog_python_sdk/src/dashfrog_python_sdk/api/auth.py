"""Authentication for DashFrog API."""

import datetime
from itertools import chain
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer, OAuth2PasswordBearer
from jose import JWTError, jwt
from pydantic import BaseModel

from dashfrog_python_sdk import get_dashfrog_instance
from dashfrog_python_sdk.api.schemas import BlockFilters, LabelFilter
from dashfrog_python_sdk.models import Notebook
from dashfrog_python_sdk.utils import get_time_range_from_time_window

ALGORITHM = "HS256"

# OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/token")

# Optional bearer token for conditional auth
security = HTTPBearer(auto_error=False)

class Token(BaseModel):
    """OAuth2 token response."""

    access_token: str
    token_type: str


def authenticate_user(username: str, password: str) -> bool:
    """Authenticate a user against config credentials."""
    dashfrog = get_dashfrog_instance()
    config = dashfrog.config

    return username == config.api_username and password == config.api_password


def create_access_token(data: dict) -> str:
    """Create a JWT access token (no expiration)."""
    dashfrog = get_dashfrog_instance()
    secret_key = dashfrog.config.api_secret_key

    to_encode = data.copy()
    encoded_jwt = jwt.encode(to_encode, secret_key, algorithm=ALGORITHM)
    return encoded_jwt


def verify_token_string(token: str) -> None:
    """Verify a JWT token string is valid.

    Args:
        token: The JWT token string to verify

    Raises:
        HTTPException: If token is invalid or user doesn't match
    """
    dashfrog = get_dashfrog_instance()
    secret_key = dashfrog.config.api_secret_key

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, secret_key, algorithms=[ALGORITHM])
        username: str | None = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    # Verify username matches config
    if username != dashfrog.config.api_username:
        raise credentials_exception


async def verify_token(token: Annotated[str, Depends(oauth2_scheme)]) -> None:
    """Verify the JWT token is valid.

    Use this as a dependency to protect endpoints:

    ```python
    @router.get("/protected")
    async def protected_route(auth: Annotated[None, Depends(verify_token)]):
        return {"message": "This is protected"}
    ```
    """
    verify_token_string(token)


def _is_label_in(label: str, value: str, filters: list[LabelFilter]) -> bool:
    return any(
        ff.label == label and ff.value == value for ff in filters
    )


def _check_filters_inclusion(filters: list[BlockFilters], filter_to_check: BlockFilters) -> bool:
    """Determines if scope delimited by filter_to_check is included in scope delimited by filters."""


    for ref_filter in filters:
        if (
            set(ref_filter.names).issubset(set(filter_to_check.names)) and 
            all(_is_label_in(ff.label, ff.value, filter_to_check.filters) for ff in ref_filter.filters)
        ):
            return True
    return False

def _check_time_window(time_window: dict | None, start: datetime.datetime, end: datetime.datetime) -> bool:
    """
    Check if the given start and end times fall within the notebook's time window.

    Args:
        time_window: Time window configuration from the notebook
        start: Start datetime to check
        end: End datetime to check

    Returns:
        True if the time range is within the window, False otherwise
    """
    if time_window is None:
        return True

    window_start, window_end = get_time_range_from_time_window(time_window)

    # For absolute time windows, check both start and end are within bounds
    if time_window["type"] == "absolute":
        return window_start <= start <= window_end and window_start <= end <= window_end
    else:
        # For relative time windows, just check that start is after the window start
        return window_start <= start 


def verify_has_access_to_notebook(credentials: HTTPAuthorizationCredentials | None, notebook: Notebook, tenant: str, start: datetime.datetime, end: datetime.datetime, flow_filter: BlockFilters | None = None, metric_filter: BlockFilters | None = None) -> None:
    
    is_authenticated = False
    if credentials is not None:
        try:
            verify_token_string(credentials.credentials)
            return
        except HTTPException:
            is_authenticated = False
    
    if not is_authenticated and not notebook.is_public:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required for private notebooks",
            headers={"WWW-Authenticate": "Bearer"},
        )

    flow_blocks_filters=[BlockFilters.parse_from_dict(f) for f in notebook.flow_blocks_filters or []]
    metric_blocks_filters=[BlockFilters.parse_from_dict(m) for m in notebook.metric_blocks_filters or []]

    filter_to_check = flow_filter or metric_filter
    assert filter_to_check is not None

    # add notebook-level filters to flow_blocks_filters and metric_blocks_filters
    for f in chain(flow_blocks_filters, metric_blocks_filters):
        for additional_filter in notebook.filters or []:
            f.filters.append(LabelFilter(label=additional_filter["label"], value=additional_filter["value"]))

    try:
        assert tenant == notebook.tenant
        assert _check_time_window(notebook.time_window, start, end)
        if flow_filter is not None:
            assert _check_filters_inclusion(flow_blocks_filters, flow_filter)
        if metric_filter is not None:
            assert _check_filters_inclusion(metric_blocks_filters, metric_filter)
    except AssertionError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="You do not have access to this notebook",
            headers={"WWW-Authenticate": "Bearer"},
        )