"""
Curriculum Generation Pydantic Schemas
Defines request and response schemas for dynamic AI curriculum generation,
including progressive learning modules and comprehensive lecture notes.
"""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class CurriculumResource(BaseModel):
    """Optional document, web link, or YouTube reference attached to the prompt."""
    id: Optional[str] = None
    type: str = Field("link", description="'file', 'link', or 'youtube'")
    title: str
    detail: Optional[str] = None
    url: Optional[str] = None
    content: Optional[str] = None


class CurriculumGenerateRequest(BaseModel):
    """Request payload to generate a curriculum from a student prompt."""
    topic: str = Field(..., min_length=2, description="Topic or question prompt from student.")
    level: str = Field("Intermediate", description="'Beginner', 'Intermediate', or 'Advanced'")
    subject: Optional[str] = Field(None, description="Optional academic category.")
    resources: Optional[List[CurriculumResource]] = Field(default_factory=list, description="Attached documents/links.")


class CurriculumModule(BaseModel):
    """A single sequential learning module within the curriculum."""
    id: str
    title: str
    duration: str = "4 min"
    status: str = "upcoming"  # 'completed' | 'in-progress' | 'upcoming'
    description: str
    keyTakeaways: List[str] = Field(default_factory=list)


class CurriculumPlanResponse(BaseModel):
    """Complete generated curriculum and notes."""
    id: str
    topic: str
    overview: str
    subject: str = "General Study"
    level: str = "Intermediate"
    estimatedMinutes: int = 15
    modules: List[CurriculumModule]
    lectureNotes: List[str] = Field(default_factory=list)
    suggestedQuestions: List[str] = Field(default_factory=list)
