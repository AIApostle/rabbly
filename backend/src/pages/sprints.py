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
from src.db.sprints import (
    create_sprint,
    delete_sprint,
    get_sprint_by_id,
    list_user_sprints,
    update_sprint,
)
from src.auth.client import get_supabase_client

sprints_router = APIRouter(prefix="/sprints", tags=["Sprints Page"])

# Initial in-memory sprints store (fallback for offline/development mode)
_memory_sprints: Dict[str, dict] = {
    "sprint-1": {
        "id": "sprint-1",
        "user_id": None,
        "title": "Master Multivariable Calculus & Vector Fields in 3 Days",
        "subject": "Mathematics & Calculus",
        "timeframe": "3-Day Sprint",
        "days_remaining": 1,
        "total_days": 3,
        "progress_percent": 66,
        "milestones": [
            {"id": "m1", "title": "1. Partial Derivatives & Gradient Direction Vectors", "status": "completed"},
            {"id": "m2", "title": "2. Double & Triple Integrals over Bounded Regions", "status": "completed"},
            {"id": "m3", "title": "3. Green's Theorem & Line Integrals in Vector Fields", "status": "in-progress"},
            {"id": "m4", "title": "4. Divergence, Curl & Stokes' Theorem Final Review", "status": "upcoming"},
        ],
        "resources": [
            {"id": "r1", "type": "file", "title": "Stewart_Calculus_Chapter14.pdf", "detail": "2.4 MB"},
            {"id": "r2", "type": "youtube", "title": "3Blue1Brown - Essence of Calculus", "detail": "YouTube Video"},
        ],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    },
    "sprint-2": {
        "id": "sprint-2",
        "user_id": None,
        "title": "Build a Production Transformer from Scratch in PyTorch",
        "subject": "Deep Learning & LLMs",
        "timeframe": "5-Day Sprint",
        "days_remaining": 3,
        "total_days": 5,
        "progress_percent": 40,
        "milestones": [
            {"id": "m1", "title": "1. Query, Key, Value Dot-Product Math & Softmax Scaling", "status": "completed"},
            {"id": "m2", "title": "2. Multi-Head Projection & Residual Connection Layers", "status": "completed"},
            {"id": "m3", "title": "3. Sinusoidal & Rotary Positional Embeddings (RoPE)", "status": "in-progress"},
            {"id": "m4", "title": "4. Causal Attention Masking & Cross-Entropy Optimization", "status": "upcoming"},
            {"id": "m5", "title": "5. Inference Generation, Top-K & Temperature Sampling", "status": "upcoming"},
        ],
        "resources": [
            {"id": "r3", "type": "file", "title": "Attention_Is_All_You_Need.pdf", "detail": "1.8 MB"},
            {"id": "r4", "type": "link", "title": "NanoGPT Architecture Reference", "detail": "github.com"},
        ],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    },
    "sprint-3": {
        "id": "sprint-3",
        "user_id": None,
        "title": "Distributed Systems & High-Throughput Rate Limiting",
        "subject": "System Design",
        "timeframe": "1-Week Sprint",
        "days_remaining": 4,
        "total_days": 7,
        "progress_percent": 50,
        "milestones": [
            {"id": "m1", "title": "1. Token Bucket vs Leaky Bucket vs Sliding Window", "status": "completed"},
            {"id": "m2", "title": "2. Atomic Redis Execution with Lua Scripting", "status": "completed"},
            {"id": "m3", "title": "3. Distributed Caching & Cluster Sharding Strategies", "status": "in-progress"},
            {"id": "m4", "title": "4. Handling Hot-Key Cascades & Graceful Degradation", "status": "upcoming"},
        ],
        "resources": [
            {"id": "r5", "type": "file", "title": "Designing_Data_Intensive_Applications.pdf", "detail": "5.1 MB"},
            {"id": "r6", "type": "youtube", "title": "Distributed Systems Lecture Series", "detail": "YouTube Tutorial"},
        ],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    },
}


def _is_supabase_ready() -> bool:
    """Checks if Supabase credentials are configured."""
    return bool(os.getenv("SUPABASE_URL") and os.getenv("SUPABASE_ANON_KEY"))


@sprints_router.get(
    "",
    response_model=List[SprintResponse],
    summary="List learning sprints",
    description="Retrieves learning sprints. When authenticated, filters sprints for the active student.",
)
async def list_sprints(
    limit: int = Query(20, ge=1, le=100, description="Max sprints to return"),
    user: Optional[UserProfile] = Depends(get_optional_user),
):
    """Returns sprints from Supabase or local memory store."""
    if _is_supabase_ready():
        try:
            client = get_supabase_client()
            if user and user.id:
                user_sprints = list_user_sprints(client, user.id, limit=limit)
                if user_sprints:
                    return user_sprints
        except Exception:
            pass

    sprints = list(_memory_sprints.values())
    if user and user.id:
        scoped = [s for s in sprints if s.get("user_id") == user.id]
        if scoped:
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
            client = get_supabase_client()
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
            client = get_supabase_client()
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
            client = get_supabase_client()
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
            client = get_supabase_client()
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
