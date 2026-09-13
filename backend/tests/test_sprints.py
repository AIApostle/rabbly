"""
Automated Test Suite for Sprints Page Endpoints
Validates listing, creation, milestone progression updates, deletion, and authenticated user binding.
"""

import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_list_sprints():
    """Verify GET /api/sprints returns list of sprints from database."""
    # Create test sprint first so listing is guaranteed non-empty
    client.post("/api/sprints", json={
        "title": "Calculus Foundations",
        "subject": "Mathematics",
        "timeframe": "3-Day Sprint",
        "days_remaining": 3,
        "total_days": 3,
        "progress_percent": 0,
        "milestones": [{"id": "m1", "title": "Limits", "status": "upcoming"}],
        "resources": [],
    })
    response = client.get("/api/sprints")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    first_sprint = data[0]
    assert "title" in first_sprint
    assert "subject" in first_sprint
    assert "milestones" in first_sprint
    assert "timeframe" in first_sprint


def test_create_and_fetch_sprint():
    """Verify POST /api/sprints creates a sprint and GET retrieves it."""
    payload = {
        "title": "Quantum Error Correction & Surface Codes in 5 Days",
        "subject": "Quantum Computing",
        "timeframe": "5-Day Sprint",
        "days_remaining": 5,
        "total_days": 5,
        "progress_percent": 0,
        "milestones": [
            {"id": "m1", "title": "1. Bit-flip and Phase-flip Code Proofs", "status": "in-progress"},
            {"id": "m2", "title": "2. Stabilizer Formalism & Syndrome Extraction", "status": "upcoming"},
            {"id": "m3", "title": "3. Toric & Planar Surface Code Lattice Geometry", "status": "upcoming"},
        ],
        "resources": [
            {"id": "r1", "type": "link", "title": "Surface Codes Tutorial", "url": "https://arxiv.org/abs/1208.0928"}
        ],
    }
    create_res = client.post("/api/sprints", json=payload)
    assert create_res.status_code == 201
    created = create_res.json()
    assert created["title"] == payload["title"]
    assert len(created["milestones"]) == 3
    sprint_id = created["id"]

    # Fetch by ID
    get_res = client.get(f"/api/sprints/{sprint_id}")
    assert get_res.status_code == 200
    fetched = get_res.json()
    assert fetched["id"] == sprint_id
    assert fetched["title"] == payload["title"]


def test_update_sprint_milestones_and_progress():
    """Verify PATCH /api/sprints/{sprint_id} updates milestones and progress percent."""
    create_res = client.post(
        "/api/sprints",
        json={
            "title": "Compilers & AST Optimization in 3 Days",
            "subject": "Computer Systems",
            "timeframe": "3-Day Sprint",
            "milestones": [
                {"id": "m1", "title": "Lexer & Parser", "status": "upcoming"},
                {"id": "m2", "title": "Type Checking", "status": "upcoming"},
            ],
        },
    )
    assert create_res.status_code == 201
    sprint_id = create_res.json()["id"]

    # Update milestone to completed and progress to 50%
    patch_res = client.patch(
        f"/api/sprints/{sprint_id}",
        json={
            "progress_percent": 50,
            "milestones": [
                {"id": "m1", "title": "Lexer & Parser", "status": "completed"},
                {"id": "m2", "title": "Type Checking", "status": "in-progress"},
            ],
        },
    )
    assert patch_res.status_code == 200
    updated = patch_res.json()
    assert updated["progress_percent"] == 50
    assert updated["milestones"][0]["status"] == "completed"


def test_delete_sprint():
    """Verify DELETE /api/sprints/{sprint_id} deletes a sprint."""
    create_res = client.post(
        "/api/sprints",
        json={
            "title": "Temporary Sprint to Delete",
            "subject": "Testing",
        },
    )
    sprint_id = create_res.json()["id"]

    del_res = client.delete(f"/api/sprints/{sprint_id}")
    assert del_res.status_code == 200
    assert del_res.json()["status"] == "deleted"

    # Confirm 404
    get_res = client.get(f"/api/sprints/{sprint_id}")
    assert get_res.status_code == 404


def test_authenticated_sprint_user_binding():
    """Verify sprints created with auth token bind to user profile."""
    signin_res = client.post(
        "/api/auth/signin",
        json={"email": "student@rabbly.ai", "password": "SecurePassword123!"},
    )
    assert signin_res.status_code == 200
    auth_data = signin_res.json()
    token = auth_data["access_token"]
    user_id = auth_data["user"]["id"]
    headers = {"Authorization": f"Bearer {token}"}

    create_res = client.post(
        "/api/sprints",
        json={
            "title": "Private User Sprint: Advanced Linear Algebra",
            "subject": "Mathematics",
        },
        headers=headers,
    )
    assert create_res.status_code == 201
    created = create_res.json()
    assert created["user_id"] == user_id

    # Fetch user sprints
    list_res = client.get("/api/sprints", headers=headers)
    assert list_res.status_code == 200
    sprints = list_res.json()
    assert any(s["title"] == "Private User Sprint: Advanced Linear Algebra" for s in sprints)
