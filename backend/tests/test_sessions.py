"""
Automated Test Suite for Learning Sessions Endpoints
Validates session listing, creation, retrieval by room code, state updates, and deletion.
"""

import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_list_sessions():
    """Verify GET /api/sessions returns a list of sessions."""
    # Seed a session dynamically
    client.post("/api/sessions", json={
        "topic": "Dynamic Test Session",
        "subject": "General Study",
        "level": "Intermediate",
    })
    response = client.get("/api/sessions")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) > 0
    first_session = data[0]
    assert "room_code" in first_session
    assert "topic" in first_session
    assert "progress_percent" in first_session


def test_create_and_fetch_session():
    """Verify POST /api/sessions creates a session and GET retrieves it."""
    payload = {
        "topic": "Graph Neural Networks & Message Passing",
        "subject": "Deep Learning",
        "level": "Advanced",
        "is_classroom": False,
        "last_checkpoint": "1. Node Embeddings",
        "completed_modules": 1,
        "total_modules": 4,
        "progress_percent": 25,
        "has_external_resources": True,
        "resource_name": "gnn_intro.pdf",
    }
    create_res = client.post("/api/sessions", json=payload)
    assert create_res.status_code == 201
    created = create_res.json()
    assert created["topic"] == payload["topic"]
    assert created["subject"] == payload["subject"]
    assert created["room_code"].startswith("RAB-")

    # Fetch by room code
    room_code = created["room_code"]
    get_res = client.get(f"/api/sessions/{room_code}")
    assert get_res.status_code == 200
    fetched = get_res.json()
    assert fetched["room_code"] == room_code
    assert fetched["topic"] == payload["topic"]


def test_update_session_progress():
    """Verify PATCH /api/sessions/{room_code} updates progress and checkpoints."""
    # Create session
    create_res = client.post(
        "/api/sessions",
        json={
            "topic": "Fourier Transforms & Signal Analysis",
            "subject": "Mathematics",
            "level": "Intermediate",
            "is_classroom": False,
        },
    )
    assert create_res.status_code == 201
    room_code = create_res.json()["room_code"]

    # Update progress
    patch_res = client.patch(
        f"/api/sessions/{room_code}",
        json={
            "completed_modules": 3,
            "progress_percent": 75,
            "last_checkpoint": "3. Discrete Fourier Transform",
            "status": "active",
        },
    )
    assert patch_res.status_code == 200
    updated = patch_res.json()
    assert updated["completed_modules"] == 3
    assert updated["progress_percent"] == 75
    assert updated["last_checkpoint"] == "3. Discrete Fourier Transform"


def test_delete_session():
    """Verify DELETE /api/sessions/{room_code} removes a session."""
    create_res = client.post(
        "/api/sessions",
        json={
            "topic": "Session to be deleted",
            "level": "Beginner",
            "is_classroom": False,
        },
    )
    room_code = create_res.json()["room_code"]

    del_res = client.delete(f"/api/sessions/{room_code}")
    assert del_res.status_code == 200
    assert del_res.json()["status"] == "deleted"

    # Confirm it returns 404
    get_res = client.get(f"/api/sessions/{room_code}")
    assert get_res.status_code == 404


def test_authenticated_user_session_wiring():
    """Verify session creation and retrieval properly binds to the authenticated user from auth."""
    # 1. Sign in to obtain auth token
    signin_res = client.post(
        "/api/auth/signin",
        json={"email": "student@rabbly.ai", "password": "SecurePassword123!"},
    )
    assert signin_res.status_code == 200
    auth_data = signin_res.json()
    token = auth_data["access_token"]
    user_id = auth_data["user"]["id"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Create session with auth token
    create_res = client.post(
        "/api/sessions",
        json={
            "topic": "Neural ODEs & Continuous Normalizing Flows",
            "subject": "Deep Learning",
            "level": "Advanced",
            "is_classroom": False,
        },
        headers=headers,
    )
    assert create_res.status_code == 201
    created_session = create_res.json()
    assert created_session["host_id"] == user_id

    # 3. Retrieve user sessions with token
    list_res = client.get("/api/sessions", headers=headers)
    assert list_res.status_code == 200
    user_sessions = list_res.json()
    assert any(s["topic"] == "Neural ODEs & Continuous Normalizing Flows" for s in user_sessions)
