from datetime import datetime
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session
from sqlalchemy.sql import delete

from dashfrog.api.schemas import CommentResponse, CreateCommentRequest
from dashfrog.dashfrog import get_dashfrog_instance
from dashfrog.models import Comment, Notebook
from dashfrog.utils import get_time_range_from_time_window

from .auth import security, verify_token, verify_token_string

router = APIRouter(prefix="/api/comments", tags=["comments"])


class GetCommentsRequest(BaseModel):
    start: datetime | None = None
    end: datetime | None = None
    notebook_id: UUID | None = None

@router.post("/list")
async def get_comments(
    request: GetCommentsRequest,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(security)] = None
) -> list[CommentResponse]:
    """
    Get all comments within a given date range.

    Either provide (start, end) or notebook_id. If notebook_id is provided,
    the time range will be extracted from the notebook's time_window.

    Authentication is optional:
    - If authenticated: can access any notebook and use direct time ranges
    - If not authenticated: can only access public notebooks (when using notebook_id)
    - Direct time range queries (start/end) require authentication
    """
    start, end = request.start, request.end
    with Session(get_dashfrog_instance().db_engine) as session:
        # Check if user is authenticated
        is_authenticated = False
        if credentials is not None:
            try:
                verify_token_string(credentials.credentials)
                is_authenticated = True
            except HTTPException:
                is_authenticated = False

        # Determine the time range
        if request.notebook_id is not None:
            # Fetch notebook and extract time window
            notebook = session.execute(
                select(Notebook).where(Notebook.id == request.notebook_id)
            ).scalar_one_or_none()

            if notebook is None:
                raise HTTPException(status_code=404, detail="Notebook not found")

            # Check access: authenticated users can access any notebook,
            # unauthenticated users can only access public notebooks
            if not is_authenticated and not notebook.is_public:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Authentication required for private notebooks",
                    headers={"WWW-Authenticate": "Bearer"},
                )

            if notebook.time_window is None:
                raise HTTPException(
                    status_code=400,
                    detail="Notebook does not have a time window configured"
                )

            start, end = get_time_range_from_time_window(notebook.time_window)
        elif start is None or end is None:
            raise HTTPException(
                status_code=400,
                detail="Either provide both start and end, or provide notebook_id"
            )
        else:
            # Direct time range queries require authentication
            if not is_authenticated:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Authentication required for direct time range queries",
                    headers={"WWW-Authenticate": "Bearer"},
                )

        # Find comments that overlap with the given date range
        comments = session.execute(
            select(Comment).where(
                Comment.start <= end,
                Comment.end >= start
            ).order_by(Comment.start.desc())
        ).scalars().all()

        return [
            CommentResponse(
                id=comment.id,
                emoji=comment.emoji,
                title=comment.title,
                start=comment.start,
                end=comment.end,
            )
            for comment in comments
        ]


@router.post("/")
async def create_comment(
    request: CreateCommentRequest,
    auth: Annotated[None, Depends(verify_token)]
) -> CommentResponse:
    """Create a new comment."""
    with Session(get_dashfrog_instance().db_engine) as session:
        comment = Comment(
            emoji=request.emoji,
            title=request.title,
            start=request.start,
            end=request.end,
        )
        session.add(comment)
        session.commit()
        session.refresh(comment)

        return CommentResponse(
            id=comment.id,
            emoji=comment.emoji,
            title=comment.title,
            start=comment.start,
            end=comment.end,
        )

@router.put("/{comment_id}")
async def update_comment(
    comment_id: int,
    request: CreateCommentRequest,
    auth: Annotated[None, Depends(verify_token)]
) -> None:
    """Update a comment."""
    with Session(get_dashfrog_instance().db_engine) as session:
        comment = session.execute(select(Comment).where(Comment.id == comment_id)).scalar_one()
        comment.emoji = request.emoji
        comment.title = request.title
        comment.start = request.start
        comment.end = request.end
        session.commit()

@router.delete("/{comment_id}") 
async def delete_comment(
    comment_id: int,
    auth: Annotated[None, Depends(verify_token)]
) -> None:
    """Delete a comment."""
    with Session(get_dashfrog_instance().db_engine) as session:
        session.execute(delete(Comment).where(Comment.id == comment_id))
        session.commit()