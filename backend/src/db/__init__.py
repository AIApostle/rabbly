"""
Rabbly Database Layer
Provides table-specific query modules and general PostgREST database utilities.
"""

from .general import (
    delete_record,
    handle_db_error,
    insert_record,
    select_all,
    select_one,
    update_record,
)
from .profiles import (
    create_profile,
    delete_profile,
    get_profile_by_email,
    get_profile_by_id,
    update_profile,
    upsert_profile,
)
from .sessions import (
    create_session,
    delete_session,
    get_session_by_code,
    get_session_by_id,
    list_user_sessions,
    update_session,
)

__all__ = [
    # General
    "handle_db_error",
    "select_one",
    "select_all",
    "insert_record",
    "update_record",
    "delete_record",
    # Profiles
    "get_profile_by_id",
    "get_profile_by_email",
    "create_profile",
    "upsert_profile",
    "update_profile",
    "delete_profile",
    # Sessions
    "get_session_by_code",
    "get_session_by_id",
    "create_session",
    "update_session",
    "list_user_sessions",
    "delete_session",
]
