"""
Authentication Pydantic Schemas
Defines request and response schemas for signup, signin, password recovery, and token verification.
"""

from typing import Any, Dict, Optional
from pydantic import BaseModel, EmailStr, Field
from .profile import UserProfile


class SignUpRequest(BaseModel):
    """Payload to register a new user with email and password."""
    email: EmailStr = Field(..., description="Student/user email address.")
    password: str = Field(..., min_length=6, description="Password (at least 6 characters).")
    full_name: Optional[str] = Field(None, description="Optional student or tutor display name.")
    metadata: Optional[Dict[str, Any]] = Field(default=None, description="Additional custom metadata.")


class SignUpResponse(BaseModel):
    """Response returned upon successful registration."""
    user: UserProfile = Field(..., description="Registered user profile.")
    access_token: Optional[str] = Field(None, description="JWT access token if email confirmation is disabled.")
    refresh_token: Optional[str] = Field(None, description="Refresh token if session was created.")
    token_type: str = Field("bearer", description="Token type header.")
    confirmation_sent: bool = Field(False, description="True if email confirmation must be verified before login.")
    message: str = Field(..., description="Status description message.")


class SignInRequest(BaseModel):
    """Credentials for signing into an existing account."""
    email: EmailStr = Field(..., description="Registered user email.")
    password: str = Field(..., description="User password.")


class SignInResponse(BaseModel):
    """Response containing authentication tokens and user profile."""
    user: UserProfile = Field(..., description="Authenticated user profile.")
    access_token: str = Field(..., description="Supabase JWT access token.")
    refresh_token: str = Field(..., description="Supabase refresh token.")
    token_type: str = Field("bearer", description="Token type header.")
    expires_in: Optional[int] = Field(None, description="Token validity in seconds.")


class ForgotPasswordRequest(BaseModel):
    """Request to initiate password reset flow."""
    email: EmailStr = Field(..., description="Email address associated with the account.")
    redirect_to: Optional[str] = Field(
        None,
        description="URL where user is redirected after clicking reset link (e.g. http://localhost:5173/reset-password)."
    )


class ResetPasswordRequest(BaseModel):
    """Payload to update password with a recovery token."""
    new_password: str = Field(..., min_length=6, description="New password (minimum 6 characters).")


class MessageResponse(BaseModel):
    """Generic status response."""
    success: bool = Field(..., description="Whether the operation succeeded.")
    message: str = Field(..., description="Informational message.")


class TokenVerificationResponse(BaseModel):
    """Response verifying the current bearer token."""
    valid: bool = Field(True, description="Indicates if the provided token is valid.")
    user: UserProfile = Field(..., description="User profile associated with the token.")
