"""
Profiles Table Database Queries
Encapsulates all Supabase PostgREST operations for the 'profiles' database table.
"""

from typing import Any, Dict, Optional
from supabase import Client

from src.schemas.profile import ProfileCreate, ProfileResponse, ProfileUpdate
from .general import delete_record, handle_db_error, insert_record, select_one, update_record

PROFILES_TABLE = "profiles"


def get_profile_by_id(client: Client, user_id: str) -> Optional[ProfileResponse]:
    """
    Fetches a profile from the 'profiles' table by user UUID.
    Returns ProfileResponse or None if record does not exist.
    """
    record = select_one(client, PROFILES_TABLE, "id", user_id)
    if not record:
        return None
    return ProfileResponse(**record)


def get_profile_by_email(client: Client, email: str) -> Optional[ProfileResponse]:
    """
    Fetches a user profile by email address.
    """
    record = select_one(client, PROFILES_TABLE, "email", email)
    if not record:
        return None
    return ProfileResponse(**record)


def create_profile(client: Client, payload: ProfileCreate) -> ProfileResponse:
    """
    Inserts a new profile record into the 'profiles' table.
    """
    data = payload.model_dump(exclude_unset=True)
    created = insert_record(client, PROFILES_TABLE, data)
    return ProfileResponse(**created)


def upsert_profile(client: Client, payload: ProfileCreate) -> ProfileResponse:
    """
    Creates or updates a profile in the 'profiles' table (upsert based on primary key 'id').
    """
    try:
        data = payload.model_dump(exclude_unset=True)
        response = client.table(PROFILES_TABLE).upsert(data).execute()
        if response.data and len(response.data) > 0:
            return ProfileResponse(**response.data[0])
        return ProfileResponse(**data)
    except Exception as exc:
        handle_db_error(exc, f"upsert on '{PROFILES_TABLE}'")
        raise


def update_profile(
    client: Client,
    user_id: str,
    payload: ProfileUpdate,
) -> Optional[ProfileResponse]:
    """
    Updates fields of an existing user profile by user UUID.
    """
    updates = payload.model_dump(exclude_unset=True, exclude_none=True)
    if not updates:
        return get_profile_by_id(client, user_id)

    updated = update_record(client, PROFILES_TABLE, "id", user_id, updates)
    if not updated:
        return None
    return ProfileResponse(**updated)


def delete_profile(client: Client, user_id: str) -> bool:
    """
    Deletes a profile from the 'profiles' table.
    """
    return delete_record(client, PROFILES_TABLE, "id", user_id)
