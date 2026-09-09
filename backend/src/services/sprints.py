"""
Learning Sprints Table Database Queries
Encapsulates all Supabase PostgREST operations for multi-day learning sprints and milestone progression.
"""

from typing import Any, Dict, List, Optional
from supabase import Client

from src.schemas.sprint import SprintCreate, SprintResponse, SprintUpdate
from .general import delete_record, insert_record, select_all, select_one, update_record

SPRINTS_TABLE = "sprints"


def get_sprint_by_id(client: Client, sprint_id: str) -> Optional[SprintResponse]:
    """Fetches a sprint by its unique ID."""
    record = select_one(client, SPRINTS_TABLE, "id", sprint_id)
    if not record:
        return None
    return SprintResponse(**record)


def create_sprint(client: Client, payload: SprintCreate) -> SprintResponse:
    """Inserts a new sprint into the 'sprints' table."""
    data = payload.model_dump(exclude_unset=True)
    created = insert_record(client, SPRINTS_TABLE, data)
    return SprintResponse(**created)


def update_sprint(
    client: Client,
    sprint_id: str,
    payload: SprintUpdate,
) -> Optional[SprintResponse]:
    """Updates sprint milestones, progress percent, or timeframe."""
    updates = payload.model_dump(exclude_unset=True, exclude_none=True)
    if not updates:
        return get_sprint_by_id(client, sprint_id)

    updated = update_record(client, SPRINTS_TABLE, "id", sprint_id, updates)
    if not updated:
        return None
    return SprintResponse(**updated)


def list_user_sprints(client: Client, user_id: str, limit: int = 20) -> List[SprintResponse]:
    """Lists sprints owned by a specific student."""
    records = select_all(
        client,
        SPRINTS_TABLE,
        filters={"user_id": user_id},
        order_by="created_at",
        desc=True,
        limit=limit,
    )
    return [SprintResponse(**r) for r in records]


def delete_sprint(client: Client, sprint_id: str) -> bool:
    """Deletes a sprint by ID."""
    return delete_record(client, SPRINTS_TABLE, "id", sprint_id)
