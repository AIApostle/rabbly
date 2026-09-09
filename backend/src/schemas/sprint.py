"""
Sprint & Learning Goal Pydantic Schemas
Defines schemas for structured multi-day learning sprints, milestones, and external study resources.
"""

from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, Field


class MilestoneSchema(BaseModel):
    """A checkpoint milestone within a learning sprint."""
    id: str = Field(..., description="Unique milestone identifier.")
    title: str = Field(..., description="Milestone topic or checkpoint title.")
    status: Literal["completed", "in-progress", "upcoming"] = Field(
        "upcoming",
        description="Milestone status.",
    )


class SprintResourceSchema(BaseModel):
    """External learning resource attached to a sprint (PDF, link, note, YouTube)."""
    id: str
    type: Literal["file", "link", "note", "youtube"] = "link"
    title: str
    detail: Optional[str] = None
    url: Optional[str] = None
    content: Optional[str] = None
    videoId: Optional[str] = None


class SprintBase(BaseModel):
    """Base fields for a learning sprint."""
    title: str = Field(..., description="Title or goal of the sprint.")
    subject: str = Field("General Mastery", description="Subject or academic domain.")
    timeframe: str = Field("3-Day Sprint", description="Sprint duration label.")
    days_remaining: int = Field(3, description="Days remaining until sprint deadline.")
    total_days: int = Field(3, description="Total days allotted for this sprint.")
    progress_percent: int = Field(0, description="Overall completion percent (0-100).")
    milestones: List[MilestoneSchema] = Field(default_factory=list, description="Ordered checklist milestones.")
    resources: List[SprintResourceSchema] = Field(default_factory=list, description="Attached study materials.")


class SprintCreate(SprintBase):
    """Payload to create a new learning sprint."""
    id: Optional[str] = Field(None, description="Optional custom ID.")
    user_id: Optional[str] = Field(None, description="Owner student UUID.")


class SprintUpdate(BaseModel):
    """Payload to update sprint progress, milestones, or timeframe."""
    title: Optional[str] = None
    subject: Optional[str] = None
    timeframe: Optional[str] = None
    days_remaining: Optional[int] = None
    total_days: Optional[int] = None
    progress_percent: Optional[int] = None
    milestones: Optional[List[MilestoneSchema]] = None
    resources: Optional[List[SprintResourceSchema]] = None


class SprintResponse(SprintBase):
    """Full sprint details returned from database or API."""
    id: str
    user_id: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
