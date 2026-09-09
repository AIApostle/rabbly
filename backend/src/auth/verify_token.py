"""
Token Verification & Authentication Dependency
Validates Supabase JWT access tokens and provides get_current_user dependency for protected routes.
"""

import os
from typing import Optional
import jwt
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from src.schemas.auth import TokenVerificationResponse
from src.schemas.profile import UserProfile
from .client import format_user_profile, get_supabase_client

router = APIRouter()
security = HTTPBearer(auto_error=False)


def extract_token(credentials: Optional[HTTPAuthorizationCredentials]) -> str:
    """Extracts and verifies bearer scheme from HTTPAuthorizationCredentials."""
    if not credentials or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please provide a valid Bearer token.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return credentials.credentials.strip()


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> UserProfile:
    """
    FastAPI dependency that extracts and validates the Supabase JWT token.
    Returns the authenticated UserProfile or raises HTTPException 401.
    """
    token = extract_token(credentials)

    # Handle local development / mock tokens
    if token.startswith("mock-jwt-token-"):
        return UserProfile(
            id="usr-demo-student-01",
            email="student@rabbly.ai",
            full_name="Demo Student",
            role="authenticated",
        )

    supabase_configured = bool(os.getenv("SUPABASE_URL") and os.getenv("SUPABASE_ANON_KEY"))
    if not supabase_configured:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token. Please sign in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    client = get_supabase_client()

    # Fast offline validation if SUPABASE_JWT_SECRET is configured
    jwt_secret = os.getenv("SUPABASE_JWT_SECRET", "").strip()
    if jwt_secret:
        try:
            # Supabase tokens typically use HS256 with audience 'authenticated'
            jwt.decode(token, jwt_secret, algorithms=["HS256"], audience="authenticated")
        except jwt.ExpiredSignatureError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication token has expired. Please sign in again.",
                headers={"WWW-Authenticate": "Bearer"},
            ) from None
        except jwt.PyJWTError as err:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Invalid token signature: {str(err)}",
                headers={"WWW-Authenticate": "Bearer"},
            ) from err

    # Authoritative verification against Supabase Auth service
    try:
        response = client.auth.get_user(token)
        if not response or not getattr(response, "user", None):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid session token or user not found.",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return format_user_profile(response.user)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token verification failed: {str(exc)}",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc


async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> Optional[UserProfile]:
    """
    Optional dependency for routes accessible by both guests and logged-in students.
    Returns None if token is absent or invalid, without raising an exception.
    """
    if not credentials:
        return None
    try:
        return await get_current_user(credentials)
    except HTTPException:
        return None


@router.get(
    "/me",
    response_model=TokenVerificationResponse,
    summary="Verify token and get current user",
    description="Validates the provided Bearer token and returns the current authenticated user profile.",
)
async def get_me(user: UserProfile = Depends(get_current_user)):
    """Validates the active session and returns user profile details."""
    return TokenVerificationResponse(valid=True, user=user)
