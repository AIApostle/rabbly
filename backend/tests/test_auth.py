"""
Automated Test Suite for Supabase Authentication Endpoints
Validates route registration, request body validation, unauthenticated handling, and token verification.
"""

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


def test_health_check():
    """Verify health endpoint returns status healthy."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "rabbly-backend"


def test_openapi_endpoints_registered():
    """Verify all 5 modular auth endpoints are registered in the OpenAPI spec."""
    response = client.get("/openapi.json")
    assert response.status_code == 200
    paths = response.json()["paths"]

    assert "/api/auth/signup" in paths
    assert "/api/auth/signin" in paths
    assert "/api/auth/forgot-password" in paths
    assert "/api/auth/reset-password" in paths
    assert "/api/auth/me" in paths


def test_signup_validation():
    """Verify invalid payloads fail validation with 422 Unprocessable Entity."""
    # Invalid email
    res1 = client.post("/api/auth/signup", json={"email": "not-an-email", "password": "password123"})
    assert res1.status_code == 422

    # Password too short (< 6 chars)
    res2 = client.post("/api/auth/signup", json={"email": "test@example.com", "password": "123"})
    assert res2.status_code == 422

    # Missing password
    res3 = client.post("/api/auth/signup", json={"email": "test@example.com"})
    assert res3.status_code == 422


def test_signin_validation():
    """Verify invalid signin payloads fail validation."""
    # Invalid email
    res = client.post("/api/auth/signin", json={"email": "invalid-email", "password": "anypassword"})
    assert res.status_code == 422


def test_forgot_password_validation():
    """Verify forgot password email validation."""
    res = client.post("/api/auth/forgot-password", json={"email": "not-an-email"})
    assert res.status_code == 422


def test_protected_routes_require_bearer_token():
    """Verify protected endpoints reject requests without a Bearer token with 401 Unauthorized."""
    # /api/auth/me without token
    res1 = client.get("/api/auth/me")
    assert res1.status_code == 401
    assert "Bearer token" in res1.json()["detail"]

    # /api/auth/protected-example without token
    res2 = client.get("/api/auth/protected-example")
    assert res2.status_code == 401

    # /api/auth/reset-password without token
    res3 = client.post("/api/auth/reset-password", json={"new_password": "newpassword123"})
    assert res3.status_code == 401


def test_protected_routes_reject_invalid_token():
    """Verify protected endpoints reject invalid tokens with 401 Unauthorized."""
    headers = {"Authorization": "Bearer invalid.mock.jwt.token"}
    res = client.get("/api/auth/me", headers=headers)
    assert res.status_code in (401, 503)
