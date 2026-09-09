"""
Pytest configuration and test environment fixtures.
Ensures tests run hermetically and reliably in mock/local test mode.
"""

import pytest


@pytest.fixture(autouse=True)
def mock_test_environment(monkeypatch):
    """Hermetic test isolation: tests run against mock local backend."""
    monkeypatch.setenv("SUPABASE_URL", "")
    monkeypatch.setenv("SUPABASE_ANON_KEY", "")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "")
    monkeypatch.setenv("SUPABASE_JWT_SECRET", "")
