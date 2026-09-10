"""
Curriculum Generation API Page Router
Located in src.pages.curriculum per modular architectural convention.
Provides endpoint for dynamically generating structured learning modules and lecture notes.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from src.schemas.curriculum import CurriculumGenerateRequest, CurriculumPlanResponse
from src.services.curriculum import generate_curriculum
from src.auth.verify_token import get_optional_user
from src.schemas.profile import UserProfile

curriculum_router = APIRouter(prefix="/curriculum", tags=["Curriculum Engine"])


@curriculum_router.post(
    "/generate",
    response_model=CurriculumPlanResponse,
    status_code=status.HTTP_200_OK,
    summary="Generate curriculum modules and lecture notes from student prompt",
)
async def generate_curriculum_endpoint(
    payload: CurriculumGenerateRequest,
    current_user: UserProfile = Depends(get_optional_user),
) -> CurriculumPlanResponse:
    """
    Accepts topic prompt, difficulty level, and optional resources.
    Returns structured pedagogical modules and lecture notes.
    """
    try:
        return generate_curriculum(payload)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate curriculum: {str(exc)}",
        ) from exc
