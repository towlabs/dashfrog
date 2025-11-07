"""Flow API routes."""

from fastapi import APIRouter

from .schemas import FlowDetailResponse, FlowListResponse

router = APIRouter(prefix="/flows", tags=["flows"])


@router.get("/", response_model=FlowListResponse)
async def list_flows() -> FlowListResponse:
    """List all flows."""
    return FlowListResponse(flows=[])


@router.get("/{flow_id}", response_model=FlowDetailResponse)
async def get_flow(flow_id: str) -> FlowDetailResponse:
    """Get a specific flow by ID."""
    return FlowDetailResponse(flow_id=flow_id)
