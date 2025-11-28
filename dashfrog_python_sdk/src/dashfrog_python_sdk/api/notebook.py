from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from dashfrog_python_sdk.api.schemas import BlockFilters, CreateNotebookRequest, SerializedNotebook
from dashfrog_python_sdk.dashfrog import get_dashfrog_instance
from dashfrog_python_sdk.models import Notebook
from .auth import security, verify_token, verify_token_string



router = APIRouter(prefix="/api/notebooks", tags=["notebooks"])


@router.get("/list")
async def get_notebooks(tenant: str, auth: Annotated[None, Depends(verify_token)]) -> list[SerializedNotebook]:
    with Session(get_dashfrog_instance().db_engine) as session:
        notebooks = session.execute(select(Notebook).where(Notebook.tenant == tenant)).scalars().all()
        return [
            SerializedNotebook(
                id=notebook.id,
                title=notebook.title,
                description=notebook.description,
                blocks=notebook.blocks,
                filters=notebook.filters,
                timeWindow=notebook.time_window,
                flowBlocksFilters=[BlockFilters.parse_from_dict(f) for f in notebook.flow_blocks_filters or []],
                metricBlocksFilters=[BlockFilters.parse_from_dict(m) for m in notebook.metric_blocks_filters or []],
                isPublic=notebook.is_public,
            )
            for notebook in notebooks
        ]


@router.get("/{id}")
async def get_notebook(
    id: UUID,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(security)] = None
) -> SerializedNotebook:
    with Session(get_dashfrog_instance().db_engine) as session:
        notebook = session.execute(select(Notebook).where(Notebook.id == id)).scalar_one()

        # If notebook is not public, verify authentication
        if not notebook.is_public:
            if credentials is None:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Authentication required for private notebooks",
                    headers={"WWW-Authenticate": "Bearer"},
                )
            # Verify the token using the shared verification logic
            verify_token_string(credentials.credentials)

        return SerializedNotebook(
            id=notebook.id,
            title=notebook.title,
            description=notebook.description,
            blocks=notebook.blocks,
            filters=notebook.filters,
            timeWindow=notebook.time_window,
            flowBlocksFilters=[BlockFilters.parse_from_dict(f) for f in notebook.flow_blocks_filters or []],
            metricBlocksFilters=[BlockFilters.parse_from_dict(m) for m in notebook.metric_blocks_filters or []],
            isPublic=notebook.is_public,
        )

@router.post("/{id}/update")
async def update_notebook(id: UUID, request: SerializedNotebook, auth: Annotated[None, Depends(verify_token)]) -> None:
    with Session(get_dashfrog_instance().db_engine) as session:
        notebook = session.execute(select(Notebook).where(Notebook.id == id)).scalar_one()
        notebook.title = request.title
        notebook.description = request.description
        notebook.blocks = request.blocks
        notebook.filters = request.filters
        notebook.time_window = request.timeWindow
        notebook.is_public = request.isPublic
        notebook.flow_blocks_filters = [f.model_dump() for f in request.flowBlocksFilters] if request.flowBlocksFilters else None
        notebook.metric_blocks_filters = [m.model_dump() for m in request.metricBlocksFilters] if request.metricBlocksFilters else None
        session.commit()


@router.post("/create")
async def create_notebook(request: CreateNotebookRequest, auth: Annotated[None, Depends(verify_token)]) -> None:
    with Session(get_dashfrog_instance().db_engine) as session:
        notebook = Notebook(
            id=request.notebook.id,
            title=request.notebook.title,
            description=request.notebook.description,
            blocks=request.notebook.blocks,
            tenant=request.tenant,
        )
        session.add(notebook)
        session.commit()


@router.delete("/{id}")
async def delete_notebook(id: UUID, auth: Annotated[None, Depends(verify_token)]) -> None:
    with Session(get_dashfrog_instance().db_engine) as session:
        session.execute(delete(Notebook).where(Notebook.id == id))
        session.commit()
