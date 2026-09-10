"""
Prompt package for Rabbly backend.

Contains pedagogical system prompts, character personas, and blackboard teaching instructions
for the real-time AI tutor agent.
"""

from src.prompt.tutor_prompt import SYSTEM_TUTOR_PROMPT, get_system_prompt

__all__ = ["SYSTEM_TUTOR_PROMPT", "get_system_prompt"]
