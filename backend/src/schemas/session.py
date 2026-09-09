"""
Session & Classroom Pydantic Schemas
Defines schemas for live learning sessions, classrooms, and whiteboard states.
"""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class SessionBase(BaseModel):
    """Base information for a learning session or classroom."""
    topic: str = Field(..., description="Subject or topic of the lesson (e.g. 'Trigonometry').")
    level: str = Field("Beginner", description="Difficulty level: Beginner, Intermediate, Advanced.")
    is_classroom: bool = Field(False, description="True if this is a collaborative multi-student room.")


class SessionCreate(SessionBase):
    """Payload to create a new session or classroom."""
    room_code: Optional[str] = Field(None, description="Custom or auto-generated room code (e.g. 'RAB-1234').")
    host_id: Optional[str] = Field(None, description="UUID of the host student or teacher.")


class SessionUpdate(BaseModel):
    """Payload to update session state."""
    status: Optional[str] = Field(None, description="'active', 'paused', or 'completed'.")
    board_state: Optional[Dict[str, Any]] = Field(None, description="Serialized whiteboard state.")
    current_step: Optional[int] = None


class SessionResponse(SessionBase):
    """Full session details returned from database."""
    id: str
    room_code: str
    host_id: Optional[str] = None
    status: str = "active"
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
