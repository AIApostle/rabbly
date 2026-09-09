"""
Profile Pydantic Schemas
Defines schemas for user profile records stored in the 'profiles' database table.
"""

from typing import Any, Dict, Optional
from pydantic import BaseModel, EmailStr, Field


class UserProfile(BaseModel):
    """Represents a Supabase authenticated user."""
    id: str = Field(..., description="Unique Supabase UUID for the user.")
    email: Optional[EmailStr] = Field(None, description="User primary email address.")
    full_name: Optional[str] = Field(None, description="Full name from user metadata or profile.")
    role: Optional[str] = Field(None, description="User authorization role (e.g. authenticated).")
    created_at: Optional[str] = Field(None, description="User account creation timestamp.")
    user_metadata: Dict[str, Any] = Field(default_factory=dict, description="Raw user metadata dictionary.")


class ProfileBase(BaseModel):
    """Base fields for a student/user profile in the profiles table."""
    full_name: Optional[str] = Field(None, max_length=100, description="Display or full name.")
    avatar_url: Optional[str] = Field(None, description="URL to user's profile avatar image.")
    bio: Optional[str] = Field(None, max_length=500, description="Short user bio or learning goals.")
    preferred_level: Optional[str] = Field("Beginner", description="Learning level: Beginner, Intermediate, Advanced.")


class ProfileCreate(ProfileBase):
    """Payload to create a new profile in the profiles table."""
    id: str = Field(..., description="Supabase auth.users UUID.")
    email: EmailStr = Field(..., description="User's primary email address.")


class ProfileUpdate(BaseModel):
    """Payload to update an existing profile."""
    full_name: Optional[str] = Field(None, max_length=100)
    avatar_url: Optional[str] = None
    bio: Optional[str] = Field(None, max_length=500)
    preferred_level: Optional[str] = None


class ProfileResponse(ProfileBase):
    """Profile data returned from database queries."""
    id: str
    email: Optional[EmailStr] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
