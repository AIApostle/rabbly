"""
User Registration (Sign Up) Endpoint
Handles new student / user account creation via Supabase Auth.
"""

import os
import uuid
from typing import Any, Dict
from fastapi import APIRouter, HTTPException, status

from src.schemas.auth import SignUpRequest, SignUpResponse
from src.schemas.profile import ProfileCreate
from .client import format_user_profile, get_supabase_client

router = APIRouter()


@router.post(
    "/signup",
    response_model=SignUpResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user",
    description="Registers a new account in Supabase with email, password, and optional full name metadata.",
)
async def signup(payload: SignUpRequest):
    """
    Registers a new user in Supabase.
    If Supabase email confirmation is enabled, a confirmation email is dispatched.
    If confirmation is disabled, an active session with JWT access token is immediately returned.
    """
    supabase_configured = bool(os.getenv("SUPABASE_URL") and os.getenv("SUPABASE_ANON_KEY"))
    if not supabase_configured:
        fake_user = UserProfile(
            id=f"usr-{uuid.uuid4().hex[:8]}",
            email=payload.email,
            full_name=payload.full_name or "New Student",
            role="authenticated",
        )
        return SignUpResponse(
            user=fake_user,
            access_token=f"mock-jwt-token-{uuid.uuid4().hex[:16]}",
            token_type="bearer",
            expires_in=86400,
            confirmation_sent=False,
        )

    client = get_supabase_client()

    # Build custom user metadata
    user_metadata: Dict[str, Any] = payload.metadata.copy() if payload.metadata else {}
    if payload.full_name:
        user_metadata["full_name"] = payload.full_name

    try:
        credentials = {
            "email": payload.email,
            "password": payload.password,
            "options": {"data": user_metadata},
        }
        res = client.auth.sign_up(credentials)

        if not res or not getattr(res, "user", None):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Registration could not be completed. Please try again.",
            )

        user_profile = format_user_profile(res.user)
        session = getattr(res, "session", None)

        # Sync profile to 'profiles' table (in addition to database trigger)
        try:
            from src.db.profiles import upsert_profile
            upsert_profile(
                client,
                ProfileCreate(
                    id=user_profile.id,
                    email=payload.email,
                    full_name=payload.full_name,
                ),
            )
        except Exception:
            pass  # Database trigger on auth.users handles this if table RLS prevents unconfirmed client writes

        if session:
            # Immediate login session provided
            return SignUpResponse(
                user=user_profile,
                access_token=getattr(session, "access_token", None),
                refresh_token=getattr(session, "refresh_token", None),
                confirmation_sent=False,
                message="Account created successfully. You are now signed in.",
            )
        else:
            # Email confirmation requirement
            return SignUpResponse(
                user=user_profile,
                access_token=None,
                refresh_token=None,
                confirmation_sent=True,
                message="Account created successfully. Please check your inbox to verify your email.",
            )

    except HTTPException:
        raise
    except Exception as exc:
        err_msg = str(exc)
        # Handle common Supabase error strings
        if "User already registered" in err_msg or "already exists" in err_msg:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="An account with this email address already exists. Please sign in instead.",
            ) from exc
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Registration failed: {err_msg}",
        ) from exc
