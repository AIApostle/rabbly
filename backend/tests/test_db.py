"""
Automated Test Suite for Database Layer and Pydantic Schemas
Validates profile and session schemas, query builder logic, and general DB utilities.
"""

import pytest
from unittest.mock import MagicMock
from src.schemas.profile import ProfileCreate, ProfileUpdate, ProfileResponse
from src.schemas.session import SessionCreate, SessionUpdate, SessionResponse
from src.services.profiles import PROFILES_TABLE, create_profile, get_profile_by_id, update_profile
from src.services.sessions import SESSIONS_TABLE, create_session, get_session_by_code
from src.services.general import select_one, select_all, delete_record


def test_profile_schema_validation():
    """Verify ProfileCreate, ProfileUpdate, and ProfileResponse validation."""
    profile_in = ProfileCreate(
        id="a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        email="student@example.com",
        full_name="Alex Student",
        preferred_level="Intermediate",
    )
    assert profile_in.email == "student@example.com"
    assert profile_in.preferred_level == "Intermediate"

    update_in = ProfileUpdate(bio="Studying quantum mechanics and AI.")
    dumped = update_in.model_dump(exclude_unset=True)
    assert dumped == {"bio": "Studying quantum mechanics and AI."}


def test_session_schema_validation():
    """Verify SessionCreate and SessionResponse validation."""
    session_in = SessionCreate(
        room_code="RAB-9012",
        topic="Transformers & Self-Attention",
        level="Intermediate",
        is_classroom=True,
    )
    assert session_in.room_code == "RAB-9012"
    assert session_in.is_classroom is True

    res = SessionResponse(
        id="f1e2d3c4-b5a6-0987-fedc-ba0987654321",
        room_code="RAB-9012",
        topic="Transformers & Self-Attention",
        level="Intermediate",
        is_classroom=True,
        status="active",
    )
    assert res.status == "active"


def test_profiles_db_query_helpers():
    """Verify mock interactions with Supabase client for profiles queries."""
    mock_client = MagicMock()
    mock_table = MagicMock()
    mock_client.table.return_value = mock_table

    # Test select_one
    mock_table.select.return_value.eq.return_value.limit.return_value.execute.return_value.data = [
        {"id": "user-123", "email": "alex@example.com", "full_name": "Alex", "preferred_level": "Beginner"}
    ]

    profile = get_profile_by_id(mock_client, "user-123")
    mock_client.table.assert_called_with(PROFILES_TABLE)
    assert profile is not None
    assert profile.email == "alex@example.com"
    assert profile.full_name == "Alex"


def test_sessions_db_query_helpers():
    """Verify mock interactions with Supabase client for sessions queries."""
    mock_client = MagicMock()
    mock_table = MagicMock()
    mock_client.table.return_value = mock_table

    mock_table.select.return_value.eq.return_value.limit.return_value.execute.return_value.data = [
        {"id": "sess-456", "room_code": "RAB-7777", "topic": "Trigonometry", "level": "Beginner", "is_classroom": False, "status": "active"}
    ]

    session = get_session_by_code(mock_client, "RAB-7777")
    mock_client.table.assert_called_with(SESSIONS_TABLE)
    assert session is not None
    assert session.room_code == "RAB-7777"
    assert session.topic == "Trigonometry"


def test_db_folder_contains_only_sql_files():
    """Verify backend/src/db directory strictly contains only Supabase .sql query files."""
    import os
    from pathlib import Path

    db_dir = Path(__file__).resolve().parent.parent / "src" / "db"
    assert db_dir.is_dir()

    files = [f for f in os.listdir(db_dir) if not f.startswith(".")]
    # Every single file in src/db must be a .sql file
    for filename in files:
        assert filename.endswith(".sql"), f"Found non-sql file in db folder: {filename}"

    expected_sql = {"schema.sql", "profiles.sql", "sessions.sql", "sprints.sql"}
    for exp in expected_sql:
        assert exp in files, f"Expected {exp} in src/db"

