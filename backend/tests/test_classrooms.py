"""
Automated Test Suite for Classrooms Page Endpoints
Validates classroom listing, creation, invite code retrieval, and student join workflow.
"""

import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_list_classrooms():
    """Verify GET /api/classrooms returns active study classrooms."""
    response = client.get("/api/classrooms")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    room = data[0]
    assert "room_code" in room
    assert "topic" in room
    assert "level" in room
    assert "participant_count" in room


def test_create_and_fetch_classroom():
    """Verify POST /api/classrooms creates room and GET /api/classrooms/{code} retrieves it."""
    payload = {
        "topic": "Graph Neural Networks & Message Passing Algorithms",
        "level": "Advanced",
        "subject": "Deep Learning",
        "resources": [
            {"type": "link", "title": "GNN Survey Paper", "detail": "arxiv.org"}
        ],
    }
    create_res = client.post("/api/classrooms", json=payload)
    assert create_res.status_code == 201
    created = create_res.json()
    assert created["topic"] == payload["topic"]
    assert created["level"] == "Advanced"
    assert created["participant_count"] >= 1
    room_code = created["room_code"]
    assert room_code.startswith("RAB-")

    # Fetch room by code
    get_res = client.get(f"/api/classrooms/{room_code}")
    assert get_res.status_code == 200
    fetched = get_res.json()
    assert fetched["room_code"] == room_code
    assert fetched["topic"] == payload["topic"]


def test_join_classroom():
    """Verify POST /api/classrooms/{code}/join adds student to room."""
    # First create a room
    create_res = client.post(
        "/api/classrooms",
        json={"topic": "Fourier Transforms & Audio Signal Processing", "level": "Intermediate"},
    )
    assert create_res.status_code == 201
    room_code = create_res.json()["room_code"]

    # Join room
    join_res = client.post(
        f"/api/classrooms/{room_code}/join",
        json={"participant_name": "Devin Learner"},
    )
    assert join_res.status_code == 200
    joined = join_res.json()
    assert any(p["name"] == "Devin Learner" for p in joined["participants"])
    assert joined["participant_count"] >= 2


def test_get_nonexistent_classroom():
    """Verify 404 error returned when room code is invalid."""
    res = client.get("/api/classrooms/RAB-999999")
    assert res.status_code == 404
    assert "not found" in res.json()["detail"].lower()
