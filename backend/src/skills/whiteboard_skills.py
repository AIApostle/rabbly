"""
Agent Skills and Capabilities for Rabbly Whiteboard Tutoring.

This module defines modular skills and pedagogical execution rules for the AI Agent.
Each skill encapsulates tool usage guidelines, visual layout rules, and reasoning heuristics
for blackboard interaction across the full tldraw action suite.
"""

from typing import List
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
        name="Typography & Explanatory Writing",
        description="Writes headers, step numbers, bullet takeaways, and conceptual definitions cleanly on the canvas.",
        tools_used=["write_text", "create_sticky_note"],
        guidelines=[
            "Use 'write_text' for clean section headers (size='l' or 'xl', font='sans' or 'draw').",
            "Use 'create_sticky_note' for important highlights, definitions, or student questions.",
            "Choose chalk colors appropriately: 'yellow' for formulas, 'light-blue' for definitions, 'green' for insights.",
        ],
    ),
    AgentSkill(
        name="Mathematical Formula Derivation",
        description="Presents mathematical proofs, derivations, and equations clearly on blackboard cards or clean chalk typography.",
        tools_used=["write_formula"],
        guidelines=[
            "Format equations with concise step-by-step lines (e.g. 'sin(θ) = Opposite / Hypotenuse = b / c').",
            "Leverage dynamic layout: you can omit x, y, width, and height to let the blackboard automatically stack and position formulas.",
            "Use style='card' for prominent theorem boxes, or style='text' for clean standalone chalk equations.",
            "Write standard math notation: superscripts (a^2 + b^2 = c^2), greek letters (\\theta, \\alpha, \\pi), and fractions are auto-formatted into clean typography.",
            "Use warm accent colors ('yellow' for primary theorems, 'light-blue' for definitions, 'green' for final answers).",
            "Break multi-part derivations into separate sequential steps rather than jamming everything into one block.",
        ],
    ),
    AgentSkill(
        name="Geometric Modeling & Trigonometry",
        description="Constructs accurate mathematical geometry, coordinate systems, and trigonometry diagrams.",
        tools_used=["draw_geometry", "create_shape"],
        guidelines=[
            "When teaching trigonometry or Pythagorean theorem, draw a 'right_triangle' with right-angle corner square.",
            "Always label sides: hypotenuse (c), opposite (b), adjacent (a), and angle (θ) so the student has visual anchor points.",
            "Use 'create_shape' with 'ellipse' or 'circle' for circular motion, unit circles, or Venn diagrams.",
            "Use 'diamond', 'star', or 'cloud' for emphasizing key concepts or thought bubbles.",
            "Place geometric diagrams on the left half of the board (x: 100-450, y: 120-400).",
        ],
    ),
    AgentSkill(
        name="Concept Connection & Relational Flow",
        description="Draws labeled vector arrows and relationships between visual elements.",
        tools_used=["draw_connector"],
        guidelines=[
            "Link related shapes using their IDs (e.g. from triangle to derivation card).",
            "Add short, informative labels along connectors (e.g. 'implies', 'differentiate', 'substitute').",
            "Use is_curved=True for elegant arcs when connecting across distant quadrants.",
        ],
    ),
    AgentSkill(
        name="Canvas Layout, Alignment & Distribution",
        description="Keeps the blackboard aesthetic, symmetrical, and readable through programmatic alignment and spacing.",
        tools_used=["align_shapes", "distribute_shapes", "reorder_shapes"],
        guidelines=[
            "After generating multiple formula cards or diagram blocks, call 'align_shapes' to align their left edges or tops.",
            "Use 'distribute_shapes' with 'vertical' to create evenly spaced lists of derivation steps.",
            "Use 'reorder_shapes' with 'bringToFront' to ensure labels and arrows sit cleanly on top of backgrounds.",
        ],
    ),
    AgentSkill(
        name="Shape Mutation & Iterative Refinement",
        description="Modifies, updates, or removes specific shapes as concepts develop.",
        tools_used=["update_shape", "delete_shapes", "duplicate_shapes"],
        guidelines=[
            "When stepping through a derivation, use 'update_shape' to highlight the active step or change color to 'green' upon completion.",
            "Use 'duplicate_shapes' when comparing before-and-after states of a geometric transformation.",
            "Delete obsolete intermediate scratch notes with 'delete_shapes'.",
        ],
    ),
    AgentSkill(
        name="Camera Directing & Visual Framing",
        description="Directs student attention by framing specific parts of the blackboard.",
        tools_used=["set_camera", "get_board_state"],
        guidelines=[
            "Before drawing new elements, inspect 'get_board_state' to check occupied coordinates.",
            "After completing a complex diagram, call 'set_camera' with mode='zoom_to_fit' to ensure the entire board is framed.",
            "When deep-diving into a detailed sub-formula, call 'set_camera' with mode='zoom_to_shapes' on that shape ID.",
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
