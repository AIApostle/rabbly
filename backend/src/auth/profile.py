"""
User Profile Update Route
Allows authenticated users to update their profile information and preferences,
including preferred AI voice persona, bio, preferred level, etc., saving to Supabase auth user_metadata
and the 'profiles' database table.
"""

import logging
import os
from typing import Any, Dict, Optional
from fastapi import APIRouter, Depends
from fastapi.security import HTTPAuthorizationCredentials
from pydantic import BaseModel, Field

from src.schemas.profile import UserProfile
from .client import format_user_profile, get_supabase_admin_client, get_supabase_client
from .verify_token import extract_token, get_current_user, security

logger = logging.getLogger("rabbly.auth.profile")
router = APIRouter()


class UpdateProfileRequest(BaseModel):
    full_name: Optional[str] = Field(None, description="User full display name")
    ai_voice: Optional[str] = Field(
        None,
        description="Preferred Gemini AI voice persona (e.g. Aoede, Puck, Fenrir, Kore, Charon)",
    )
    avatar_url: Optional[str] = Field(None, description="Avatar image URL or emoji identifier")
    bio: Optional[str] = Field(None, description="User bio or study goal")
    preferred_level: Optional[str] = Field(
        None, description="Learning level: Beginner, Intermediate, Advanced"
    )


@router.patch(
    "/profile",
    response_model=UserProfile,
    summary="Update current user profile and AI voice persona",
    description="Updates user profile fields and preferences (e.g., ai_voice, bio, preferred_level) in Supabase.",
)
@router.put(
    "/profile",
    response_model=UserProfile,
    summary="Update current user profile and AI voice persona",
)
async def update_profile_endpoint(
    payload: UpdateProfileRequest,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    current_user: UserProfile = Depends(get_current_user),
) -> UserProfile:
    token = extract_token(credentials)

    # Handle local mock development tokens
    if token.startswith("mock-jwt-token-"):
        updated_meta = dict(current_user.user_metadata)
        if payload.ai_voice:
            updated_meta["aiVoice"] = payload.ai_voice
            updated_meta["ai_voice"] = payload.ai_voice
            updated_meta["voice_persona"] = payload.ai_voice
        if payload.full_name:
            current_user.full_name = payload.full_name
            updated_meta["full_name"] = payload.full_name
        current_user.user_metadata = updated_meta
        return current_user

    metadata_updates: Dict[str, Any] = {}
    if payload.ai_voice:
        metadata_updates["aiVoice"] = payload.ai_voice
        metadata_updates["ai_voice"] = payload.ai_voice
        metadata_updates["voice_persona"] = payload.ai_voice
    if payload.full_name:
        metadata_updates["full_name"] = payload.full_name
    if payload.avatar_url:
        metadata_updates["avatar_url"] = payload.avatar_url
    if payload.bio:
        metadata_updates["bio"] = payload.bio
    if payload.preferred_level:
        metadata_updates["preferred_level"] = payload.preferred_level

    supabase_configured = bool(os.getenv("SUPABASE_URL") and os.getenv("SUPABASE_ANON_KEY"))
    if not supabase_configured or not metadata_updates:
        return current_user

    user_profile = current_user

    # 1. Update user metadata via Supabase Admin or Client
    try:
        admin_client = get_supabase_admin_client()
        updated_res = admin_client.auth.admin.update_user_by_id(
            current_user.id,
            {"user_metadata": {**current_user.user_metadata, **metadata_updates}},
        )
        if updated_res and getattr(updated_res, "user", None):
            user_profile = format_user_profile(updated_res.user)
        else:
            current_user.user_metadata.update(metadata_updates)
            user_profile = current_user
    except Exception as exc:
        logger.warning(f"Admin auth update failed, attempting user client update: {exc}")
        try:
            client = get_supabase_client()
            client.postgrest.auth(token)
            updated_res = client.auth.update_user({"data": metadata_updates})
            if updated_res and getattr(updated_res, "user", None):
                user_profile = format_user_profile(updated_res.user)
            else:
                current_user.user_metadata.update(metadata_updates)
                user_profile = current_user
        except Exception as e2:
            logger.error(f"Failed to update auth user metadata: {e2}")
            current_user.user_metadata.update(metadata_updates)
            user_profile = current_user

    # 2. Update profiles database table if present
    try:
        admin_client = get_supabase_admin_client()
        db_updates: Dict[str, Any] = {}
        if payload.full_name:
            db_updates["full_name"] = payload.full_name
        if payload.avatar_url:
            db_updates["avatar_url"] = payload.avatar_url
        if payload.bio:
            db_updates["bio"] = payload.bio
        if payload.preferred_level:
            db_updates["preferred_level"] = payload.preferred_level

        if db_updates:
            admin_client.table("profiles").update(db_updates).eq("id", current_user.id).execute()
    except Exception as exc:
        logger.debug(f"Profiles table update ignored or non-critical: {exc}")

    return user_profile
