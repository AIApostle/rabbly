"""
Learning Sessions & Classroom FastAPI Router
Provides endpoints to manage, persist, query, and resume learning sessions.
Supports both live Supabase storage and local in-memory fallback for offline/development environments.
"""

import os
import uuid
from datetime import datetime, timezone
from typing import Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status

from src.auth.verify_token import get_optional_user
from src.schemas.profile import UserProfile
from src.schemas.session import SessionCreate, SessionResponse, SessionUpdate
from src.db.sessions import (
    create_session,
    delete_session,
    get_session_by_code,
    list_user_sessions,
    update_session,
)
from src.auth.client import get_supabase_client

sessions_router = APIRouter(prefix="/sessions", tags=["Sessions"])

# Local in-memory session store used when Supabase is not configured or in testing/offline mode
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


@sessions_router.get(
    "",
    response_model=List[SessionResponse],
    summary="List recent learning sessions",
    description="Retrieves a list of recent learning sessions for the user or public demo lessons.",
)
async def list_sessions(
    limit: int = Query(20, ge=1, le=100, description="Max number of sessions to return"),
    user: Optional[UserProfile] = Depends(get_optional_user),
):
    """Returns recent sessions, querying Supabase when configured or falling back to local store."""
    if _is_supabase_ready():
        try:
            client = get_supabase_client()
            if user and user.id:
                return list_user_sessions(client, user.id, limit=limit)
        except Exception:
            pass

    # In-memory fallback
    sessions = list(_memory_sessions.values())
    if user and user.id:
        user_sessions = [s for s in sessions if s.get("host_id") == user.id]
        if user_sessions:
            return [SessionResponse(**s) for s in user_sessions[:limit]]

    return [SessionResponse(**s) for s in sessions[:limit]]


@sessions_router.post(
    "",
    response_model=SessionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create or initialize a new session",
    description="Initializes a new 1-on-1 tutoring session or shared classroom.",
)
async def create_new_session(
    payload: SessionCreate,
    user: Optional[UserProfile] = Depends(get_optional_user),
):
    """Creates a new session record and returns its room code and metadata."""
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
            client = get_supabase_client()
            return create_session(client, full_payload)
        except Exception:
            pass

    # Save into memory store
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
        "board_state": {},
        "created_at": now_iso,
        "updated_at": now_iso,
    }
    _memory_sessions[room_code] = record
    return SessionResponse(**record)


@sessions_router.get(
    "/{room_code}",
    response_model=SessionResponse,
    summary="Get session by room code",
    description="Fetches an active or historical session and its preserved whiteboard state.",
)
async def get_session(room_code: str):
    """Retrieves session details by unique room code."""
    if _is_supabase_ready():
        try:
            client = get_supabase_client()
            found = get_session_by_code(client, room_code)
            if found:
                return found
        except Exception:
            pass

    if room_code in _memory_sessions:
        return SessionResponse(**_memory_sessions[room_code])

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"Session with room code '{room_code}' was not found.",
    )


@sessions_router.patch(
    "/{room_code}",
    response_model=SessionResponse,
    summary="Update session state or progress",
    description="Updates checkpoint progress, whiteboard state, or completion status of a session.",
)
async def update_session_state(room_code: str, payload: SessionUpdate):
    """Updates whiteboard snapshots, checkpoint progress, or status."""
    if _is_supabase_ready():
        try:
            client = get_supabase_client()
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
    return SessionResponse(**item)


@sessions_router.delete(
    "/{room_code}",
    summary="Delete a session",
    description="Removes a session from recent history.",
)
async def delete_session_record(room_code: str):
    """Deletes a session by room code."""
    deleted = False
    if _is_supabase_ready():
        try:
            client = get_supabase_client()
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
