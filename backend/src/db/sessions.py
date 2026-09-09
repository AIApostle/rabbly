"""
Sessions & Classrooms Table Database Queries
Encapsulates all Supabase PostgREST operations for learning sessions and collaborative classrooms.
"""

from typing import Any, Dict, List, Optional
from supabase import Client

from src.schemas.session import SessionCreate, SessionResponse, SessionUpdate
from .general import delete_record, insert_record, select_all, select_one, update_record

SESSIONS_TABLE = "sessions"


def get_session_by_code(client: Client, room_code: str) -> Optional[SessionResponse]:
    """
    Fetches a session by room code (e.g. 'RAB-4821').
    """
    record = select_one(client, SESSIONS_TABLE, "room_code", room_code)
    if not record:
        return None
    return SessionResponse(**record)


def get_session_by_id(client: Client, session_id: str) -> Optional[SessionResponse]:
    """
    Fetches a session by primary UUID.
    """
    record = select_one(client, SESSIONS_TABLE, "id", session_id)
    if not record:
        return None
    return SessionResponse(**record)


def create_session(client: Client, payload: SessionCreate) -> SessionResponse:
    """
    Inserts a new learning session / classroom into the 'sessions' table.
    """
    data = payload.model_dump(exclude_unset=True)
    created = insert_record(client, SESSIONS_TABLE, data)
    return SessionResponse(**created)


def update_session(
    client: Client,
    room_code: str,
    payload: SessionUpdate,
) -> Optional[SessionResponse]:
    """
    Updates the state, whiteboard snapshot, or status of an active session.
    """
    updates = payload.model_dump(exclude_unset=True, exclude_none=True)
    if not updates:
        return get_session_by_code(client, room_code)

    updated = update_record(client, SESSIONS_TABLE, "room_code", room_code, updates)
    if not updated:
        return None
    return SessionResponse(**updated)


def list_user_sessions(client: Client, user_id: str, limit: int = 20) -> List[SessionResponse]:
    """
    Lists recent sessions hosted by a specific user.
    """
    records = select_all(
        client,
        SESSIONS_TABLE,
        filters={"host_id": user_id},
        order_by="created_at",
        desc=True,
        limit=limit,
    )
    return [SessionResponse(**r) for r in records]


def delete_session(client: Client, room_code: str) -> bool:
    """
    Deletes a session by room code.
    """
    return delete_record(client, SESSIONS_TABLE, "room_code", room_code)
