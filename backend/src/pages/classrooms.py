"""
Classrooms Page Backend Controller / Router
Located in src.pages.classrooms per architectural convention.
Provides collaborative study room management, room code generation, participant tracking, and Supabase integration.
"""

import os
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field

from src.auth.verify_token import get_optional_user
from src.schemas.profile import UserProfile
from src.schemas.session import SessionCreate, SessionResponse
from src.db.sessions import (
    create_session,
    get_session_by_code,
    list_user_sessions,
)
from src.auth.client import get_supabase_client

classrooms_router = APIRouter(prefix="/classrooms", tags=["Classrooms Page"])


class ClassroomCreatePayload(BaseModel):
    """Payload to create a new collaborative classroom."""
    topic: str = Field(..., description="Subject or curriculum topic for the classroom.")
    level: str = Field("Intermediate", description="Difficulty level: Beginner, Intermediate, Advanced.")
    subject: Optional[str] = Field("Collaborative Study", description="Academic subject or domain.")
    resources: Optional[List[Dict[str, Any]]] = Field(default_factory=list, description="Attached documents or links.")
    room_code: Optional[str] = Field(None, description="Optional custom room code.")


class ClassroomJoinPayload(BaseModel):
    """Payload to join an active classroom."""
    participant_name: Optional[str] = Field(None, description="Display name for the joining student.")


class ClassroomDetailsResponse(BaseModel):
    """Classroom metadata and live participants."""
    id: str
    room_code: str
    topic: str
    level: str
    subject: str
    status: str = "active"
    host_id: Optional[str] = None
    host_name: str = "Host Student"
    participant_count: int = 1
    participants: List[Dict[str, Any]] = Field(default_factory=list)
    has_external_resources: bool = False
    resources: List[Dict[str, Any]] = Field(default_factory=list)
    created_at: str
    updated_at: str


# Initial in-memory study rooms (fallback for local dev & testing)
_memory_classrooms: Dict[str, dict] = {
    "RAB-9412": {
        "id": "room-1",
        "room_code": "RAB-9412",
        "topic": "Distributed Token Bucket Rate Limiting with Redis & Lua",
        "level": "Advanced",
        "subject": "System Architecture",
        "status": "active",
        "host_id": "user-alex",
        "host_name": "Alex Rivera",
        "participant_count": 3,
        "participants": [
            {"id": "p-1", "name": "Alex Rivera (Host)", "avatar": "🎓", "is_host": True},
            {"id": "p-2", "name": "Maya Chen", "avatar": "👩🏻‍💻", "is_host": False},
            {"id": "p-3", "name": "Jordan Patel", "avatar": "👨🏽‍🎓", "is_host": False},
        ],
        "has_external_resources": True,
        "resources": [
            {"id": "r-1", "type": "link", "title": "System Design Primer - Rate Limiter", "detail": "github.com"},
        ],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    },
    "RAB-3820": {
        "id": "room-2",
        "room_code": "RAB-3820",
        "topic": "Quantum Superposition & Bell State Entanglement",
        "level": "Beginner",
        "subject": "Quantum Physics",
        "status": "active",
        "host_id": "user-elena",
        "host_name": "Elena Rostova",
        "participant_count": 2,
        "participants": [
            {"id": "p-4", "name": "Elena Rostova (Host)", "avatar": "⚛️", "is_host": True},
            {"id": "p-5", "name": "Marcus Vance", "avatar": "👨🏼‍🔬", "is_host": False},
        ],
        "has_external_resources": False,
        "resources": [],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    },
}


def _is_supabase_ready() -> bool:
    """Checks if Supabase credentials are configured."""
    return bool(os.getenv("SUPABASE_URL") and os.getenv("SUPABASE_ANON_KEY"))


@classrooms_router.get(
    "",
    response_model=List[ClassroomDetailsResponse],
    summary="List collaborative classrooms",
    description="Fetches active study classrooms.",
)
async def list_classrooms(
    limit: int = Query(20, ge=1, le=100, description="Max rooms to return"),
    user: Optional[UserProfile] = Depends(get_optional_user),
):
    """
    Returns available collaborative study classrooms.
    """
    if _is_supabase_ready():
        try:
            client = get_supabase_client()
            from src.db.general import select_all
            records = select_all(
                client,
                "sessions",
                filters={"is_classroom": True},
                order_by="created_at",
                desc=True,
                limit=limit,
            )
            if records:
                results: List[ClassroomDetailsResponse] = []
                for r in records:
                    board_state = r.get("board_state") or {}
                    participants = board_state.get("participants", [])
                    resources = board_state.get("resources", [])
                    results.append(
                        ClassroomDetailsResponse(
                            id=str(r.get("id")),
                            room_code=r.get("room_code", ""),
                            topic=r.get("topic", ""),
                            level=r.get("level", "Intermediate"),
                            subject=r.get("subject", "Collaborative Study"),
                            status=r.get("status", "active"),
                            host_id=r.get("host_id"),
                            host_name=board_state.get("host_name", "Host Student"),
                            participant_count=len(participants) if participants else 1,
                            participants=participants,
                            has_external_resources=bool(resources),
                            resources=resources,
                            created_at=r.get("created_at") or datetime.now(timezone.utc).isoformat(),
                            updated_at=r.get("updated_at") or datetime.now(timezone.utc).isoformat(),
                        )
                    )
                return results
        except Exception:
            pass

    # In-memory rooms fallback
    rooms = list(_memory_classrooms.values())
    return [ClassroomDetailsResponse(**r) for r in rooms[:limit]]


@classrooms_router.post(
    "",
    response_model=ClassroomDetailsResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new classroom study room",
    description="Initializes a collaborative study room, generates an invite code, and sets up the session.",
)
async def create_classroom(
    payload: ClassroomCreatePayload,
    user: Optional[UserProfile] = Depends(get_optional_user),
):
    """
    Creates an invite-only classroom room.
    """
    room_code = payload.room_code or f"RAB-{uuid.uuid4().hex[:4].upper()}"
    room_id = f"room-{uuid.uuid4().hex[:8]}"
    now_iso = datetime.now(timezone.utc).isoformat()
    if user:
        host_name = user.full_name or (user.email.split("@")[0] if user.email else "Host Student")
        host_id = user.id
    else:
        host_name = "Host Student"
        host_id = None

    host_participant = {
        "id": f"p-{uuid.uuid4().hex[:6]}",
        "name": f"{host_name} (Host)",
        "avatar": "🎓",
        "is_host": True,
        "joined_at": "Just now",
    }

    if _is_supabase_ready():
        try:
            client = get_supabase_client()
            db_payload = SessionCreate(
                topic=payload.topic,
                level=payload.level,
                is_classroom=True,
                subject=payload.subject or "Collaborative Study",
                last_checkpoint="1. Foundation & Intuition",
                completed_modules=0,
                total_modules=4,
                progress_percent=0,
                room_code=room_code,
                host_id=host_id,
                has_external_resources=bool(payload.resources),
                resource_name=payload.resources[0].get("title") if payload.resources else None,
            )
            created_session = create_session(client, db_payload)
            return ClassroomDetailsResponse(
                id=created_session.id,
                room_code=created_session.room_code,
                topic=created_session.topic,
                level=created_session.level,
                subject=created_session.subject or "Collaborative Study",
                status=created_session.status,
                host_id=created_session.host_id,
                host_name=host_name,
                participant_count=1,
                participants=[host_participant],
                has_external_resources=bool(payload.resources),
                resources=payload.resources or [],
                created_at=created_session.created_at or now_iso,
                updated_at=created_session.updated_at or now_iso,
            )
        except Exception:
            pass

    # In-memory fallback
    room_record = {
        "id": room_id,
        "room_code": room_code,
        "topic": payload.topic,
        "level": payload.level,
        "subject": payload.subject or "Collaborative Study",
        "status": "active",
        "host_id": host_id,
        "host_name": host_name,
        "participant_count": 1,
        "participants": [host_participant],
        "has_external_resources": bool(payload.resources),
        "resources": payload.resources or [],
        "created_at": now_iso,
        "updated_at": now_iso,
    }
    _memory_classrooms[room_code] = room_record
    return ClassroomDetailsResponse(**room_record)


@classrooms_router.get(
    "/{room_code}",
    response_model=ClassroomDetailsResponse,
    summary="Get classroom details by invite code",
    description="Validates that a classroom code exists and returns its topic, level, and active members.",
)
async def get_classroom(room_code: str):
    """
    Looks up a classroom room by room code (e.g. 'RAB-9412').
    """
    clean_code = room_code.strip().upper()

    if _is_supabase_ready():
        try:
            client = get_supabase_client()
            session = get_session_by_code(client, clean_code)
            if session and session.is_classroom:
                board_state = session.board_state or {}
                participants = board_state.get("participants", [])
                resources = board_state.get("resources", [])
                return ClassroomDetailsResponse(
                    id=session.id,
                    room_code=session.room_code,
                    topic=session.topic,
                    level=session.level,
                    subject=session.subject or "Collaborative Study",
                    status=session.status,
                    host_id=session.host_id,
                    host_name=board_state.get("host_name", "Host Student"),
                    participant_count=len(participants) if participants else 1,
                    participants=participants,
                    has_external_resources=bool(resources),
                    resources=resources,
                    created_at=session.created_at or datetime.now(timezone.utc).isoformat(),
                    updated_at=session.updated_at or datetime.now(timezone.utc).isoformat(),
                )
        except Exception:
            pass

    if clean_code in _memory_classrooms:
        return ClassroomDetailsResponse(**_memory_classrooms[clean_code])

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"Classroom with invite code '{clean_code}' was not found. Please verify the code and try again.",
    )


@classrooms_router.post(
    "/{room_code}/join",
    response_model=ClassroomDetailsResponse,
    summary="Join an active classroom",
    description="Registers participant entry into a classroom.",
)
async def join_classroom(
    room_code: str,
    payload: ClassroomJoinPayload,
    user: Optional[UserProfile] = Depends(get_optional_user),
):
    """
    Adds a participant to a classroom room.
    """
    clean_code = room_code.strip().upper()
    user_name = payload.participant_name or (
        (user.full_name or (user.email.split("@")[0] if user.email else "Student Participant"))
        if user
        else "Student Participant"
    )

    new_participant = {
        "id": f"p-{uuid.uuid4().hex[:6]}",
        "name": user_name,
        "avatar": "👨🏽‍🎓",
        "is_host": False,
        "joined_at": "Just now",
    }

    if clean_code in _memory_classrooms:
        room = _memory_classrooms[clean_code]
        # Avoid duplicate participant
        if not any(p.get("name") == user_name for p in room["participants"]):
            room["participants"].append(new_participant)
            room["participant_count"] = len(room["participants"])
            room["updated_at"] = datetime.now(timezone.utc).isoformat()
        return ClassroomDetailsResponse(**room)

    # Check database
    if _is_supabase_ready():
        try:
            client = get_supabase_client()
            session = get_session_by_code(client, clean_code)
            if session and session.is_classroom:
                return ClassroomDetailsResponse(
                    id=session.id,
                    room_code=session.room_code,
                    topic=session.topic,
                    level=session.level,
                    subject=session.subject or "Collaborative Study",
                    status=session.status,
                    host_id=session.host_id,
                    host_name="Host Student",
                    participant_count=2,
                    participants=[new_participant],
                    has_external_resources=session.has_external_resources,
                    resources=[],
                    created_at=session.created_at or datetime.now(timezone.utc).isoformat(),
                    updated_at=session.updated_at or datetime.now(timezone.utc).isoformat(),
                )
        except Exception:
            pass

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"Classroom '{clean_code}' not found.",
    )
