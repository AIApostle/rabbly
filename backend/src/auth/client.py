"""
Supabase Client Singleton & Environment Loader
Manages official Supabase client connections and handles configuration checks.
"""

import os
from pathlib import Path
from typing import Optional
from dotenv import load_dotenv
from fastapi import HTTPException, status
from supabase import create_client, Client

from src.schemas.profile import UserProfile

# Locate and load the backend .env file
env_path = Path(__file__).resolve().parent.parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

_supabase_client: Optional[Client] = None
_supabase_admin_client: Optional[Client] = None


def get_supabase_client() -> Client:
    """
    Returns a cached Supabase client using the project's anonymous public key.
    Raises HTTPException 503 if SUPABASE_URL or SUPABASE_ANON_KEY are missing.
    """
    global _supabase_client
    if _supabase_client is not None:
        return _supabase_client

    supabase_url = os.getenv("SUPABASE_URL", "").strip()
    supabase_key = os.getenv("SUPABASE_ANON_KEY", "").strip()

    if not supabase_url or not supabase_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "Supabase is not configured. Please define SUPABASE_URL and "
                "SUPABASE_ANON_KEY in backend/.env"
            ),
        )

    try:
        _supabase_client = create_client(supabase_url, supabase_key)
        return _supabase_client
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to initialize Supabase client: {str(exc)}",
        ) from exc


def get_supabase_admin_client() -> Client:
    """
    Returns an administrative Supabase client using the SERVICE_ROLE_KEY if configured.
    Falls back to the standard anonymous client if service role key is absent.
    """
    global _supabase_admin_client
    if _supabase_admin_client is not None:
        return _supabase_admin_client

    supabase_url = os.getenv("SUPABASE_URL", "").strip()
    service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip()

    if not service_key:
        return get_supabase_client()

    try:
        _supabase_admin_client = create_client(supabase_url, service_key)
        return _supabase_admin_client
    except Exception:
        return get_supabase_client()


def format_user_profile(user: object) -> UserProfile:
    """
    Helper function to safely extract and format a Supabase User object into a UserProfile model.
    """
    metadata = getattr(user, "user_metadata", {}) or {}
    full_name = metadata.get("full_name") or metadata.get("name")
    
    return UserProfile(
        id=str(getattr(user, "id", "")),
        email=getattr(user, "email", None),
        full_name=full_name,
        role=getattr(user, "role", None),
        created_at=str(getattr(user, "created_at", "")) if getattr(user, "created_at", None) else None,
        user_metadata=metadata,
    )
