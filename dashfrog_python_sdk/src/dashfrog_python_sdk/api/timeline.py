"""Timeline API routes."""

from fastapi import APIRouter

from .schemas import TimelineDetailResponse, TimelineListResponse

router = APIRouter(prefix="/timelines", tags=["timelines"])


@router.get("/", response_model=TimelineListResponse)
async def list_timelines() -> TimelineListResponse:
    """List all timelines."""
    return TimelineListResponse(timelines=[])


@router.get("/{timeline_id}", response_model=TimelineDetailResponse)
async def get_timeline(timeline_id: str) -> TimelineDetailResponse:
    """Get a specific timeline by ID."""
    return TimelineDetailResponse(timeline_id=timeline_id)
