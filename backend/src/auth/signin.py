"""
User Authentication (Sign In) Endpoint
Handles email/password sign-in and returns active Supabase JWT tokens.
"""

import os
import uuid
from fastapi import APIRouter, HTTPException, status

from src.schemas.auth import SignInRequest, SignInResponse
from src.schemas.profile import UserProfile
from .client import format_user_profile, get_supabase_client

router = APIRouter()


@router.post(
    "/signin",
    response_model=SignInResponse,
    summary="Sign in with email and password",
    description="Authenticates an existing user and returns JWT access and refresh tokens.",
)
@router.post(
    "/login",
    response_model=SignInResponse,
    include_in_schema=False,
    summary="Alias for /signin",
)
async def signin(payload: SignInRequest):
    """
    Validates user credentials against Supabase.
    Returns the user profile and JWT access_token to be supplied in the Authorization header.
    """
    supabase_configured = bool(os.getenv("SUPABASE_URL") and os.getenv("SUPABASE_ANON_KEY"))
    if not supabase_configured:
        fake_user = UserProfile(
            id="usr-demo-student-01",
            email=payload.email,
            full_name=payload.email.split("@")[0].title() or "Demo Student",
            role="authenticated",
        )
        return SignInResponse(
            user=fake_user,
            access_token=f"mock-jwt-token-{uuid.uuid4().hex[:16]}",
            refresh_token=f"mock-refresh-{uuid.uuid4().hex[:16]}",
            token_type="bearer",
            expires_in=86400,
        )

    client = get_supabase_client()

    try:
        credentials = {
            "email": payload.email,
            "password": payload.password,
        }
        res = client.auth.sign_in_with_password(credentials)

        if not res or not getattr(res, "session", None) or not getattr(res, "user", None):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password. Please verify your credentials.",
                headers={"WWW-Authenticate": "Bearer"},
            )

        session = res.session
        user_profile = format_user_profile(res.user)

        return SignInResponse(
            user=user_profile,
            access_token=session.access_token,
            refresh_token=session.refresh_token,
            token_type="bearer",
            expires_in=getattr(session, "expires_in", None),
        )

    except HTTPException:
        raise
    except Exception as exc:
        err_msg = str(exc)
        if "Invalid login credentials" in err_msg or "invalid_grant" in err_msg:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password. Please check your credentials and try again.",
                headers={"WWW-Authenticate": "Bearer"},
            ) from exc
        if "Email not confirmed" in err_msg:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Your email has not been confirmed yet. Please verify your email via the link sent to your inbox.",
            ) from exc
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Authentication failed: {err_msg}",
        ) from exc
