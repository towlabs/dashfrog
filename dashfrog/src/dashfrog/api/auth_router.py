"""Authentication routes."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm

from .auth import (
    Token,
    authenticate_user,
    create_access_token,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/token", response_model=Token)
async def login(form_data: Annotated[OAuth2PasswordRequestForm, Depends()]) -> Token:
    """Login endpoint to get an access token.

    Args:
        form_data: OAuth2 form with username and password

    Returns:
        Token with access_token and token_type (token never expires)

    Example:
        curl -X POST "http://localhost:8000/api/auth/token" \\
             -H "Content-Type: application/x-www-form-urlencoded" \\
             -d "username=admin&password=admin"
    """
    is_authenticated = authenticate_user(form_data.username, form_data.password)
    if not is_authenticated:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = create_access_token(data={"sub": form_data.username})
    return Token(access_token=access_token, token_type="bearer")
