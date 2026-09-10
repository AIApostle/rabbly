"""
Agent Skills and Capabilities for Rabbly Whiteboard Tutoring.

This module defines modular skills and pedagogical execution rules for the AI Agent.
Each skill encapsulates tool usage guidelines, visual layout rules, and reasoning heuristics
for blackboard interaction.
"""

from typing import Dict, List
from pydantic import BaseModel, Field


class AgentSkill(BaseModel):
    """
    Specification of an agent skill or procedural capability.

    Attributes:
        name: Name of the skill (e.g. 'Geometry Visualization').
        description: High-level overview of what the skill achieves.
        tools_used: List of MCP tools associated with this skill.
        guidelines: Step-by-step instructions and heuristics for the agent.
    """

    name: str = Field(..., description="Unique skill name.")
    description: str = Field(..., description="Description of the skill's purpose.")
    tools_used: List[str] = Field(default_factory=list, description="Tools leveraged by this skill.")
    guidelines: List[str] = Field(default_factory=list, description="Specific rules and best practices.")


WHITEBOARD_SKILLS: List[AgentSkill] = [
    AgentSkill(
        name="Geometric Modeling & Trigonometry",
        description="Constructs accurate mathematical geometry and trigonometry diagrams on the canvas.",
        tools_used=["draw_geometry"],
        guidelines=[
            "When teaching trigonometry or Pythagorean theorem, draw a 'right_triangle' with right-angle corner square.",
            "Always label sides: hypotenuse (c), opposite (b), adjacent (a), and angle (θ) so the student has visual anchor points.",
            "Place geometric diagrams on the left half of the board (x: 100-450, y: 120-400).",
            "Use 'circle' when illustrating unit circles, angles, or circular motion.",
        ],
    ),
    AgentSkill(
        name="Mathematical Formula Derivation",
        description="Presents mathematical proofs, derivations, and equations clearly on blackboard cards.",
        tools_used=["write_formula"],
        guidelines=[
            "Format equations clearly with concise step-by-step lines (e.g. 'sin(θ) = Opposite / Hypotenuse').",
            "Position formulas on the right side of the blackboard (x: 540-1050, y: 120-400).",
            "Use warm accent colors ('yellow' for primary theorems, 'light-blue' for definitions, 'green' for final answers).",
            "Break complex derivations into separate cards rather than jamming everything into one block.",
        ],
    ),
    AgentSkill(
        name="Concept Connection & Flow",
        description="Draws labeled vector arrows and relationships between visual elements.",
        tools_used=["draw_connector"],
        guidelines=[
            "Link related shapes using their IDs (e.g. from triangle to derivation card).",
            "Add short, informative labels along connectors (e.g. 'implies', 'differentiate', 'substitute').",
        ],
    ),
    AgentSkill(
        name="Spatial Layout & Overlap Avoidance",
        description="Maintains an organized, clutter-free blackboard layout using spatial state inspection.",
        tools_used=["get_board_state", "zoom_to_fit"],
        guidelines=[
            "Before drawing new elements, inspect the board state or use the cached spatial summary.",
            "If the board is already crowded, find an open quadrant or suggest clearing the board before continuing.",
            "Call 'zoom_to_fit' after creating complex multi-element diagrams so the student sees the complete picture.",
        ],
    ),
    AgentSkill(
        name="Board Hygiene & Progression",
        description="Cleans and resets the blackboard cleanly when moving between curriculum milestones.",
        tools_used=["clear_board"],
        guidelines=[
            "Verbalize that you are wiping the board before calling 'clear_board'.",
            "Never clear the board abruptly without student acknowledgement or topic completion.",
        ],
    ),
]


def build_skills_instruction() -> str:
    """
    Compile all registered agent skills into a comprehensive instruction prompt.

    Returns:
        str: Formatted markdown instructions detailing all available skills.
    """
    sections = ["## Specialized Whiteboard Skills & Tool Protocols:"]
    for skill in WHITEBOARD_SKILLS:
        tools_str = ", ".join(f"'{t}'" for t in skill.tools_used)
        sections.append(f"\n### Skill: {skill.name}")
        sections.append(f"**Purpose**: {skill.description}")
        sections.append(f"**Tools**: {tools_str}")
        sections.append("**Execution Rules**:")
        for rule in skill.guidelines:
            sections.append(f"- {rule}")

    return "\n".join(sections)
