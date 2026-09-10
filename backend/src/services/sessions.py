"""
Sessions & Classrooms Table Database Queries
Encapsulates all Supabase PostgREST operations for learning sessions and collaborative classrooms.
"""

from typing import Any, Dict, List, Optional
from supabase import Client

from src.schemas.session import SessionCreate, SessionResponse, SessionUpdate
from .general import delete_record, insert_record, select_all, select_one, update_record

SESSIONS_TABLE = "sessions"


def _hydrate_session_record(record: dict) -> dict:
    """
    Ensures subject, checkpoints, and module counts are populated from board_state
    if top-level database columns are absent or null.
    """
    if not isinstance(record, dict):
        return record

    rec = dict(record)
    board_state = rec.get("board_state") or {}
    if not isinstance(board_state, dict):
        board_state = {}

    metadata = board_state.get("metadata") or {}
    plan = board_state.get("curriculum_plan") or {}
    modules = plan.get("modules") or []
    sources = plan.get("sourceMaterials") or []

    if not rec.get("subject"):
        rec["subject"] = metadata.get("subject") or plan.get("subject") or "General Study"

    if rec.get("completed_modules") is None:
        rec["completed_modules"] = metadata.get("completed_modules", 0)

    if rec.get("total_modules") is None:
        rec["total_modules"] = metadata.get("total_modules", len(modules) if modules else 4)

    if not rec.get("last_checkpoint"):
        first_title = modules[0].get("title") if modules else "1. Foundation & Intuition"
        rec["last_checkpoint"] = metadata.get("last_checkpoint") or first_title

    if rec.get("progress_percent") is None:
        rec["progress_percent"] = metadata.get("progress_percent", 0)

    if rec.get("has_external_resources") is None:
        rec["has_external_resources"] = metadata.get("has_external_resources", len(sources) > 0)

    if not rec.get("resource_name"):
        rec["resource_name"] = metadata.get("resource_name") or (sources[0].get("title") if sources else None)

    return rec


def get_session_by_code(client: Client, room_code: str) -> Optional[SessionResponse]:
    """
    Fetches a session by room code (e.g. 'RAB-4821').
    """
    record = select_one(client, SESSIONS_TABLE, "room_code", room_code)
    if not record:
        return None
    return SessionResponse(**_hydrate_session_record(record))


def get_session_by_id(client: Client, session_id: str) -> Optional[SessionResponse]:
    """
    Fetches a session by primary UUID.
    """
    record = select_one(client, SESSIONS_TABLE, "id", session_id)
    if not record:
        return None
    return SessionResponse(**_hydrate_session_record(record))


def create_session(client: Client, payload: SessionCreate) -> SessionResponse:
    """
    Inserts a new learning session / classroom into the 'sessions' table.
    Gracefully handles missing database columns by preserving metadata inside board_state.
    """
    data = payload.model_dump(exclude_unset=True)

    # Ensure metadata is stored in board_state so no learning data is lost
    board_state = data.get("board_state") or {}
    if not isinstance(board_state, dict):
        board_state = {}

    metadata = board_state.get("metadata") or {}
    metadata.setdefault("subject", data.get("subject", "General Study"))
    metadata.setdefault("last_checkpoint", data.get("last_checkpoint", "1. Foundation & Intuition"))
    metadata.setdefault("completed_modules", data.get("completed_modules", 0))
    metadata.setdefault("total_modules", data.get("total_modules", 4))
    metadata.setdefault("progress_percent", data.get("progress_percent", 0))
    metadata.setdefault("has_external_resources", data.get("has_external_resources", False))
    metadata.setdefault("resource_name", data.get("resource_name"))
    board_state["metadata"] = metadata
    data["board_state"] = board_state

    # 1. Try full insert (if user ran SQL migration with all columns)
    try:
        created = insert_record(client, SESSIONS_TABLE, data)
        return SessionResponse(**_hydrate_session_record(created))
    except Exception as err:
        err_msg = str(err)
        # 2. Fallback to base table columns if top-level columns are not present
        if "PGRST204" in err_msg or "column" in err_msg.lower():
            core_columns = {"id", "room_code", "host_id", "topic", "level", "is_classroom", "status", "board_state"}
            fallback_data = {k: v for k, v in data.items() if k in core_columns}
            created = insert_record(client, SESSIONS_TABLE, fallback_data)
            return SessionResponse(**_hydrate_session_record(created))
        raise


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

    # Try full update
    try:
        updated = update_record(client, SESSIONS_TABLE, "room_code", room_code, updates)
        if not updated:
            return None
        return SessionResponse(**_hydrate_session_record(updated))
    except Exception as err:
        err_msg = str(err)
        if "PGRST204" in err_msg or "column" in err_msg.lower():
            # Update board_state with latest metadata
            current = select_one(client, SESSIONS_TABLE, "room_code", room_code)
            if current:
                board_state = current.get("board_state") or {}
                metadata = board_state.get("metadata") or {}
                for field in ["last_checkpoint", "completed_modules", "total_modules", "progress_percent"]:
                    if field in updates:
                        metadata[field] = updates[field]
                board_state["metadata"] = metadata
                core_updates = {k: v for k, v in updates.items() if k in {"status", "board_state"}}
                core_updates["board_state"] = board_state
                updated = update_record(client, SESSIONS_TABLE, "room_code", room_code, core_updates)
                if updated:
                    return SessionResponse(**_hydrate_session_record(updated))
        raise


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
    return [SessionResponse(**_hydrate_session_record(r)) for r in records]


def list_all_sessions(client: Client, limit: int = 20) -> List[SessionResponse]:
    """
    Lists recent sessions across all rooms (for explore / public learning).
    """
    records = select_all(
        client,
        SESSIONS_TABLE,
        order_by="created_at",
        desc=True,
        limit=limit,
    )
    return [SessionResponse(**_hydrate_session_record(r)) for r in records]


def delete_session(client: Client, room_code: str) -> bool:
    """
    Deletes a session by room code.
    """
    return delete_record(client, SESSIONS_TABLE, "room_code", room_code)

