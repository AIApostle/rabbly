"""
Authentication Models Re-export
All Pydantic models are centrally defined in src.schemas and re-exported here for backward compatibility.
"""

from src.schemas.auth import (
    ForgotPasswordRequest,
    MessageResponse,
    ResetPasswordRequest,
    SignInRequest,
    SignInResponse,
    SignUpRequest,
    SignUpResponse,
    TokenVerificationResponse,
)
from src.schemas.profile import UserProfile

__all__ = [
    "UserProfile",
    "SignUpRequest",
    "SignUpResponse",
    "SignInRequest",
    "SignInResponse",
    "ForgotPasswordRequest",
    "ResetPasswordRequest",
    "MessageResponse",
    "TokenVerificationResponse",
]
