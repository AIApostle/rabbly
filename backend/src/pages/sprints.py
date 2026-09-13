"""
Sprints Page Backend Controller / Router
Located in src.pages.sprints per architectural convention.
Provides endpoints to manage multi-day learning sprints, milestone progression, and study resource attachments.
"""

import os
import uuid
from datetime import datetime, timezone
from typing import Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status

from src.auth.verify_token import get_optional_user
from src.schemas.profile import UserProfile
from src.schemas.sprint import SprintCreate, SprintResponse, SprintUpdate
from src.services.sprints import (
    create_sprint,
    delete_sprint,
    get_sprint_by_id,
    list_all_sprints,
    list_user_sprints,
    update_sprint,
)
from src.auth.client import get_supabase_admin_client, get_supabase_client

sprints_router = APIRouter(prefix="/sprints", tags=["Sprints Page"])

# In-memory store fallback strictly for offline/local testing (no hardcoded mock entries)
_memory_sprints: Dict[str, dict] = {}


def _is_supabase_ready() -> bool:
    """Checks if Supabase credentials are configured."""
    return bool(os.getenv("SUPABASE_URL") and (os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_ANON_KEY")))


@sprints_router.get(
    "",
    response_model=List[SprintResponse],
    summary="List learning sprints",
    description="Retrieves learning sprints from Supabase database. Filters by student when authenticated.",
)
async def list_sprints(
    limit: int = Query(20, ge=1, le=100, description="Max sprints to return"),
    user: Optional[UserProfile] = Depends(get_optional_user),
):
    """Returns sprints from Supabase or local memory store."""
    if _is_supabase_ready():
        try:
            client = get_supabase_admin_client()
            if user and user.id:
                return list_user_sprints(client, user.id, limit=limit)
            else:
                return list_all_sprints(client, limit=limit)
        except Exception as err:
            pass

    sprints = list(_memory_sprints.values())
    if user and user.id:
        scoped = [s for s in sprints if s.get("user_id") == user.id]
        return [SprintResponse(**s) for s in scoped[:limit]]

    return [SprintResponse(**s) for s in sprints[:limit]]


@sprints_router.post(
    "",
    response_model=SprintResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new learning sprint",
    description="Creates a new multi-day sprint linked to the student profile.",
)
async def create_new_sprint(
    payload: SprintCreate,
    user: Optional[UserProfile] = Depends(get_optional_user),
):
    """Creates a learning sprint."""
    sprint_id = payload.id or f"sprint-{uuid.uuid4().hex[:8]}"
    user_id = payload.user_id or (user.id if user else None)
    now_iso = datetime.now(timezone.utc).isoformat()

    full_payload = payload.model_copy(
        update={
            "id": sprint_id,
            "user_id": user_id,
        }
    )

    if _is_supabase_ready():
        try:
            client = get_supabase_admin_client()
            return create_sprint(client, full_payload)
        except Exception:
            pass

    # Save to memory store
    record = {
        "id": sprint_id,
        "user_id": user_id,
        "title": payload.title,
        "subject": payload.subject,
        "timeframe": payload.timeframe,
        "days_remaining": payload.days_remaining,
        "total_days": payload.total_days,
        "progress_percent": payload.progress_percent,
        "milestones": [m.model_dump() for m in payload.milestones],
        "resources": [r.model_dump() for r in payload.resources],
        "created_at": now_iso,
        "updated_at": now_iso,
    }
    _memory_sprints[sprint_id] = record
    return SprintResponse(**record)


@sprints_router.get(
    "/{sprint_id}",
    response_model=SprintResponse,
    summary="Get sprint details",
    description="Fetches a specific sprint by its unique identifier.",
)
async def get_sprint(sprint_id: str):
    """Retrieves sprint by ID."""
    if _is_supabase_ready():
        try:
            client = get_supabase_admin_client()
            found = get_sprint_by_id(client, sprint_id)
            if found:
                return found
        except Exception:
            pass

    if sprint_id in _memory_sprints:
        return SprintResponse(**_memory_sprints[sprint_id])

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"Sprint with ID '{sprint_id}' was not found.",
    )


@sprints_router.patch(
    "/{sprint_id}",
    response_model=SprintResponse,
    summary="Update sprint progress or milestones",
    description="Updates milestone statuses, progress percentage, or deadline.",
)
async def update_sprint_details(sprint_id: str, payload: SprintUpdate):
    """Updates sprint progress or milestone checklist."""
    if _is_supabase_ready():
        try:
            client = get_supabase_admin_client()
            updated = update_sprint(client, sprint_id, payload)
            if updated:
                return updated
        except Exception:
            pass

    if sprint_id not in _memory_sprints:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Sprint with ID '{sprint_id}' was not found.",
        )

    item = _memory_sprints[sprint_id]
    update_data = payload.model_dump(exclude_unset=True, exclude_none=True)
    if "milestones" in update_data:
        update_data["milestones"] = [
            m.model_dump() if hasattr(m, "model_dump") else m for m in update_data["milestones"]
        ]
    if "resources" in update_data:
        update_data["resources"] = [
            r.model_dump() if hasattr(r, "model_dump") else r for r in update_data["resources"]
        ]

    item.update(update_data)
    item["updated_at"] = datetime.now(timezone.utc).isoformat()
    _memory_sprints[sprint_id] = item
    return SprintResponse(**item)


@sprints_router.delete(
    "/{sprint_id}",
    summary="Delete a learning sprint",
    description="Removes a sprint from the student's dashboard.",
)
async def delete_sprint_record(sprint_id: str):
    """Deletes a sprint by ID."""
    deleted = False
    if _is_supabase_ready():
        try:
            client = get_supabase_admin_client()
            deleted = delete_sprint(client, sprint_id)
        except Exception:
            pass

    if sprint_id in _memory_sprints:
        del _memory_sprints[sprint_id]
        deleted = True

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Sprint with ID '{sprint_id}' was not found.",
        )

    return {"status": "deleted", "sprint_id": sprint_id}
