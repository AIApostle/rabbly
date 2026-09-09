"""
Forgot Password (Password Recovery) Endpoint
Dispatches password reset instructions with recovery link via Supabase Auth.
"""

from fastapi import APIRouter, HTTPException, status

from src.schemas.auth import ForgotPasswordRequest, MessageResponse
from .client import get_supabase_client

router = APIRouter()


@router.post(
    "/forgot-password",
    response_model=MessageResponse,
    summary="Request password reset email",
    description="Sends a password reset link to the specified email address via Supabase Auth.",
)
async def forgot_password(payload: ForgotPasswordRequest):
    """
    Triggers a password recovery email.
    Always returns success to prevent user enumeration attacks.
    """
    client = get_supabase_client()

    options = {}
    if payload.redirect_to:
        options["redirect_to"] = payload.redirect_to

    try:
        if options:
            client.auth.reset_password_for_email(payload.email, options)
        else:
            client.auth.reset_password_for_email(payload.email)

        return MessageResponse(
            success=True,
            message=(
                "If an account with that email exists, a password reset link "
                "has been sent to your inbox."
            ),
        )

    except HTTPException:
        raise
    except Exception as exc:
        # Avoid leaking whether email exists, but report general errors
        err_msg = str(exc)
        if "rate limit" in err_msg.lower():
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many password reset requests. Please wait a few minutes before trying again.",
            ) from exc
        return MessageResponse(
            success=True,
            message=(
                "If an account with that email exists, a password reset link "
                "has been sent to your inbox."
            ),
        )
