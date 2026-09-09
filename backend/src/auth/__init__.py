"""
Rabbly Supabase Authentication Module
Provides modular endpoints and security dependencies for user signup, signin, password management, and token verification.
"""

from .client import get_supabase_admin_client, get_supabase_client
from .models import (
    ForgotPasswordRequest,
    MessageResponse,
    ResetPasswordRequest,
    SignInRequest,
    SignInResponse,
    SignUpRequest,
    SignUpResponse,
    TokenVerificationResponse,
    UserProfile,
)
from .router import auth_router
from .verify_token import get_current_user, get_optional_user

__all__ = [
    "auth_router",
    "get_current_user",
    "get_optional_user",
    "get_supabase_client",
    "get_supabase_admin_client",
    "SignUpRequest",
    "SignUpResponse",
    "SignInRequest",
    "SignInResponse",
    "ForgotPasswordRequest",
    "ResetPasswordRequest",
    "MessageResponse",
    "TokenVerificationResponse",
    "UserProfile",
]
