"""
Reset Password Endpoint
Updates an authenticated user's password using a valid Bearer token or recovery session.
"""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from src.schemas.auth import MessageResponse, ResetPasswordRequest
from src.schemas.profile import UserProfile
from .client import get_supabase_admin_client, get_supabase_client
from .verify_token import extract_token, get_current_user

router = APIRouter()
security = HTTPBearer(auto_error=False)


@router.post(
    "/reset-password",
    response_model=MessageResponse,
    summary="Reset user password",
    description="Updates password for the currently authenticated user (or user with recovery token).",
)
async def reset_password(
    payload: ResetPasswordRequest,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    current_user: UserProfile = Depends(get_current_user),
):
    """
    Updates the password for the authenticated user.
    Requires Bearer token in the Authorization header (standard access token or recovery token).
    """
    token = extract_token(credentials)
    client = get_supabase_client()

    try:
        # First attempt: update via user session JWT directly
        client.auth._request(
            "PUT",
            "user",
            body={"password": payload.new_password},
            jwt=token,
        )
        return MessageResponse(
            success=True,
            message="Your password has been successfully updated. You can now sign in with your new password.",
        )
    except Exception as user_err:
        # Second attempt: try via administrative client if service role key is configured
        try:
            admin_client = get_supabase_admin_client()
            admin_client.auth.admin.update_user_by_id(
                current_user.id,
                {"password": payload.new_password},
            )
            return MessageResponse(
                success=True,
                message="Your password has been successfully updated. You can now sign in with your new password.",
            )
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to reset password: {str(user_err)}",
            ) from user_err
