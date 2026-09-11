"""
Curriculum Generation & Library API Page Router
Located in src.pages.curriculum per modular architectural convention.
Provides endpoints for dynamically generating structured learning modules, lecture notes,
source materials, and retrieving the student's saved curriculum library from Supabase.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from src.schemas.curriculum import CurriculumGenerateRequest, CurriculumPlanResponse
from src.services.curriculum import generate_curriculum, list_user_library
from src.auth.verify_token import get_optional_user
from src.schemas.profile import UserProfile

curriculum_router = APIRouter(prefix="/curriculum", tags=["Curriculum & Library Engine"])

# different departments for oil and gas
@curriculum_router.post(
    "/generate",
    response_model=CurriculumPlanResponse,
    status_code=status.HTTP_200_OK,
    summary="Generate curriculum modules, notes, and source materials from student prompt",
)
async def generate_curriculum_endpoint(
    payload: CurriculumGenerateRequest,
    current_user: Optional[UserProfile] = Depends(get_optional_user),
) -> CurriculumPlanResponse:
    """
    Accepts topic prompt, difficulty level, and optional attached resources.
    Generates modules, key takeaways, lecture notes, and source materials,
    automatically persisting the session into Supabase.
    """
    try:
        return generate_curriculum(payload, user=current_user)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate curriculum: {str(exc)}",
        ) from exc


@curriculum_router.get(
    "/library",
    response_model=List[CurriculumPlanResponse],
    status_code=status.HTTP_200_OK,
    summary="List saved curriculum plans, modules, and notes across sessions",
)
async def get_library_endpoint(
    limit: int = Query(50, ge=1, le=100, description="Max library items to return"),
    current_user: Optional[UserProfile] = Depends(get_optional_user),
) -> List[CurriculumPlanResponse]:
    """
    Retrieves all past curricula, modules, notes, and source materials
    saved for the active user across their sessions from Supabase.
    """
    try:
        return list_user_library(user=current_user, limit=limit)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch library: {str(exc)}",
        ) from exc
