"""
Recent Sessions Page Backend Controller / Router
Located in src.pages.recent_sessions per architectural convention.
Connects learning session history, progress tracking, and whiteboard state to authenticated user profiles.
"""

import os
import uuid
from datetime import datetime, timezone
from typing import Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status

from src.auth.verify_token import get_optional_user
from src.schemas.profile import UserProfile
from src.schemas.session import SessionCreate, SessionResponse, SessionUpdate
from src.services.sessions import (
    create_session,
    delete_session,
    get_session_by_code,
    list_all_sessions,
    list_user_sessions,
    update_session,
    _hydrate_session_record,
)
from src.auth.client import get_supabase_admin_client

recent_sessions_router = APIRouter(prefix="/sessions", tags=["Recent Sessions Page"])

# In-memory store for sessions (fallback when Supabase is not configured or in testing)
_memory_sessions: Dict[str, dict] = {
    "RAB-1011": {
        "id": "sess-1",
        "room_code": "RAB-1011",
        "topic": "Transformers & Self-Attention: The Engine of LLMs",
        "subject": "AI & LLMs",
        "level": "Intermediate",
        "is_classroom": False,
        "status": "active",
        "last_checkpoint": "2. The Query, Key, and Value (Q, K, V) Vector Mechanics",
        "completed_modules": 2,
        "total_modules": 4,
        "progress_percent": 50,
        "has_external_resources": True,
        "resource_name": "Attention_Is_All_You_Need.pdf",
        "board_state": {},
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    },
    "RAB-1012": {
        "id": "sess-2",
        "room_code": "RAB-1012",
        "topic": "Distributed Rate Limiter Design with Redis",
        "subject": "System Architecture",
        "level": "Advanced",
        "is_classroom": False,
        "status": "active",
        "last_checkpoint": "3. Atomic Redis Lua Script Execution",
        "completed_modules": 3,
        "total_modules": 4,
        "progress_percent": 75,
        "has_external_resources": True,
        "resource_name": "system_design_primer.md",
        "board_state": {},
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    },
    "RAB-1013": {
        "id": "sess-3",
        "room_code": "RAB-1013",
        "topic": "Quantum Superposition & Qubit Geometry",
        "subject": "Quantum Physics",
        "level": "Beginner",
        "is_classroom": False,
        "status": "active",
        "last_checkpoint": "1. The Bloch Sphere & Linear Combinations",
        "completed_modules": 1,
        "total_modules": 4,
        "progress_percent": 25,
        "has_external_resources": False,
        "resource_name": None,
        "board_state": {},
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    },
    "RAB-1014": {
        "id": "sess-4",
        "room_code": "RAB-1014",
        "topic": "B-Tree Database Indexing & Page Splitting",
        "subject": "Database Systems",
        "level": "Intermediate",
        "is_classroom": False,
        "status": "completed",
        "last_checkpoint": "4. Summary & Range Query Performance",
        "completed_modules": 4,
        "total_modules": 4,
        "progress_percent": 100,
        "has_external_resources": False,
        "resource_name": None,
        "board_state": {},
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    },
}


def _is_supabase_ready() -> bool:
    """Checks if Supabase credentials are set in environment."""
    return bool(os.getenv("SUPABASE_URL") and os.getenv("SUPABASE_ANON_KEY"))


@recent_sessions_router.get(
    "",
    response_model=List[SessionResponse],
    summary="List recent sessions (Recent Sessions Page)",
    description="Retrieves recent learning sessions. When authenticated, filters sessions by the active student.",
)
async def list_recent_sessions(
    limit: int = Query(20, ge=1, le=100, description="Max number of sessions to return"),
    user: Optional[UserProfile] = Depends(get_optional_user),
):
    """
    Returns user sessions or real recent learning sessions.
    Connects with the active user from the Auth module when a Bearer token is provided.
    """
    if _is_supabase_ready():
        try:
            client = get_supabase_admin_client()
            if user and user.id:
                # Return real sessions for this user from Supabase.
                # If user has 0 sessions, this correctly returns [] without showing handcoded fake data.
                return list_user_sessions(client, user.id, limit=limit)
            else:
                # If unauthenticated, retrieve the latest real sessions from Supabase
                records = list_all_sessions(client, limit=limit)
                if records:
                    return records
        except Exception as err:
            print(f"[RecentSessions] Supabase list error: {err}")

    # Fallback to in-memory session store only when Supabase is not configured or in offline dev
    sessions = list(_memory_sessions.values())
    if user and user.id:
        scoped = [s for s in sessions if s.get("host_id") == user.id]
        return [SessionResponse(**_hydrate_session_record(s)) for s in scoped[:limit]]

    if not _is_supabase_ready():
        return [SessionResponse(**_hydrate_session_record(s)) for s in sessions[:limit]]

    return []


@recent_sessions_router.post(
    "",
    response_model=SessionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create or initialize a session",
    description="Creates a new session and links it to the authenticated student.",
)
async def create_new_session(
    payload: SessionCreate,
    user: Optional[UserProfile] = Depends(get_optional_user),
):
    """
    Initializes a new session.
    Automatically assigns host_id from the authenticated user token if logged in.
    """
    room_code = payload.room_code or f"RAB-{uuid.uuid4().hex[:4].upper()}"
    host_id = payload.host_id or (user.id if user else None)
    session_id = f"sess-{uuid.uuid4().hex[:8]}"
    now_iso = datetime.now(timezone.utc).isoformat()

    full_payload = payload.model_copy(
        update={
            "room_code": room_code,
            "host_id": host_id,
        }
    )

    if _is_supabase_ready():
        try:
            client = get_supabase_admin_client()
            return create_session(client, full_payload)
        except Exception as err:
            print(f"[RecentSessions] Supabase create error: {err}")

    # Memory store fallback
    record = {
        "id": session_id,
        "room_code": room_code,
        "host_id": host_id,
        "topic": payload.topic,
        "subject": payload.subject or "General Study",
        "level": payload.level,
        "is_classroom": payload.is_classroom,
        "status": "active",
        "last_checkpoint": payload.last_checkpoint or "1. Foundation & Intuition",
        "completed_modules": payload.completed_modules,
        "total_modules": payload.total_modules,
        "progress_percent": payload.progress_percent,
        "has_external_resources": payload.has_external_resources,
        "resource_name": payload.resource_name,
        "board_state": payload.board_state or {},
        "created_at": now_iso,
        "updated_at": now_iso,
    }
    _memory_sessions[room_code] = record
    return SessionResponse(**_hydrate_session_record(record))


@recent_sessions_router.get(
    "/{room_code}",
    response_model=SessionResponse,
    summary="Get session details and whiteboard state",
    description="Retrieves a specific learning session by room code to resume learning.",
)
async def get_session(room_code: str):
    """Fetches full session details and whiteboard state."""
    if _is_supabase_ready():
        try:
            client = get_supabase_admin_client()
            found = get_session_by_code(client, room_code)
            if found:
                return found
        except Exception:
            pass

    if room_code in _memory_sessions:
        return SessionResponse(**_hydrate_session_record(_memory_sessions[room_code]))

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"Session with room code '{room_code}' was not found.",
    )


@recent_sessions_router.patch(
    "/{room_code}",
    response_model=SessionResponse,
    summary="Update session progress",
    description="Updates checkpoints, whiteboard snapshots, or status.",
)
async def update_session_state(room_code: str, payload: SessionUpdate):
    """Updates progress or whiteboard state."""
    if _is_supabase_ready():
        try:
            client = get_supabase_admin_client()
            updated = update_session(client, room_code, payload)
            if updated:
                return updated
        except Exception:
            pass

    if room_code not in _memory_sessions:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session with room code '{room_code}' was not found.",
        )

    item = _memory_sessions[room_code]
    update_data = payload.model_dump(exclude_unset=True, exclude_none=True)
    item.update(update_data)
    item["updated_at"] = datetime.now(timezone.utc).isoformat()
    _memory_sessions[room_code] = item
    return SessionResponse(**_hydrate_session_record(item))


@recent_sessions_router.delete(
    "/{room_code}",
    summary="Delete a session",
    description="Removes a session from history.",
)
async def delete_session_record(room_code: str):
    """Deletes a session by room code."""
    deleted = False
    if _is_supabase_ready():
        try:
            client = get_supabase_admin_client()
            deleted = delete_session(client, room_code)
        except Exception:
            pass

    if room_code in _memory_sessions:
        del _memory_sessions[room_code]
        deleted = True

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session with room code '{room_code}' was not found.",
        )

    return {"status": "deleted", "room_code": room_code}
