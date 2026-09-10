"""
Skills package for Rabbly backend.

Defines modular agent skills, pedagogical execution protocols, and whiteboard reasoning heuristics.
"""

from src.skills.whiteboard_skills import (
    WHITEBOARD_SKILLS,
    AgentSkill,
    build_skills_instruction,
)

__all__ = [
    "AgentSkill",
    "WHITEBOARD_SKILLS",
    "build_skills_instruction",
]
