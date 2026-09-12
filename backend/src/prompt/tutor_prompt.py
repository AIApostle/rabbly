"""
System Prompts and Pedagogical Instructions for Rabbly AI Tutor.

This module houses the core personas, conversational instructions, pedagogical guidelines,
and whiteboard layout directives for the Gemini Live agent.
"""
from typing import Optional

SYSTEM_TUTOR_PROMPT = """You are Rabbly, an energetic live AI STEM teacher.
You teach students at an interactive digital blackboard in real time with two-way voice and synchronized visual illustrations.
You have 15 real-time blackboard tools: write_text, write_formula, draw_geometry, create_shape, create_sticky_note, draw_connector, update_shape, delete_shapes, align_shapes, distribute_shapes, reorder_shapes, set_camera, clear_board, get_board_state.

Whiteboard Vision & Action Directives:
1. Whiteboard Inspection: You teach at a 1280x720 blackboard canvas. Always call `get_board_state` whenever you need to check what is currently drawn or written on the board, inspect student work, or verify open coordinates.
2. Synchronized Speech & Visuals: Whenever you introduce, explain, or derive a concept, theorem, or equation, you MUST immediately call your whiteboard tools to draw the diagrams and write the formulas on the blackboard while speaking naturally.
3. Natural Conversational Tone: Speak directly to the student as if standing at a chalkboard. Never recite internal tool syntax, parameter names, or planning headers in your spoken voice.

Spatial Layout (1280x720 Canvas):
- Title / Header: (x: 80, y: 50) using write_text (size='l', color='violet').
- Left Quadrant (x: 80-480, y: 120-550): Geometric diagrams (draw_geometry) and shapes (create_shape).
- Right Quadrant (x: 540-1150, y: 120-550): Formulas (write_formula) and key takeaways (create_sticky_note).
- Topic Transitions: When starting a brand new topic or module, call clear_board to start with a fresh canvas."""


def build_curriculum_instructions(curriculum_data: Optional[dict]) -> str:
    """
    Formats an active curriculum plan into concise pedagogical guidelines,
    ensuring the agent knows the topic, module roadmap, and key formulas without
    bloating the system prompt.
    """
    if not curriculum_data or not isinstance(curriculum_data, dict):
        return ""

    topic = curriculum_data.get("topic") or "STEM & Mathematics"
    subject = curriculum_data.get("subject") or "General Study"
    level = curriculum_data.get("level") or "High School"
    overview = curriculum_data.get("overview") or f"Interactive session on {topic}."

    lines = [
        f"Active Lesson Assignment: {topic} ({subject}, {level})",
        f"Lesson Goal: {overview}",
    ]

    # Modules
    modules = curriculum_data.get("modules") or []
    if modules:
        lines.append("Modules to cover:")
        for idx, m in enumerate(modules, start=1):
            if isinstance(m, dict):
                title = m.get("title", f"Module {idx}")
                desc = m.get("description", "")
                lines.append(f"- Module {idx}: {title} - {desc}")

    # Lecture Notes & Formulas
    notes = curriculum_data.get("lectureNotes") or []
    if notes:
        lines.append("Key Concepts & Formulas to illustrate on the blackboard:")
        for n in notes[:5]:
            lines.append(f"- {n}")

    return "\n".join(lines)


def build_initial_greeting_prompt(curriculum_data: Optional[dict] = None) -> str:
    """
    Constructs the initial spoken greeting prompt from the student perspective,
    prompting the live teacher to check the blackboard state, introduce the lesson,
    and immediately draw the opening concepts on the blackboard.
    """
    if not curriculum_data or not isinstance(curriculum_data, dict) or not curriculum_data.get("topic"):
        return (
            "Hi Rabbly! I am ready to begin our live STEM lesson. "
            "Please call get_board_state to check the blackboard, introduce yourself warmly, "
            "write a welcome title at (80, 50), and sketch our opening concepts on the board now."
        )

    topic = curriculum_data.get("topic")
    modules = curriculum_data.get("modules") or []
    first_module = "Module 1"
    if modules and isinstance(modules[0], dict):
        first_module = modules[0].get("title", "Module 1")

    return (
        f"Hi Rabbly! I am ready to learn about {topic}. "
        f"Please call get_board_state to check the blackboard, introduce yourself warmly, "
        f"write the lesson title '{topic}' at (80, 50), and draw the opening concepts for {first_module} on the blackboard now."
    )


def get_system_prompt(curriculum_data: Optional[dict] = None) -> str:
    """
    Retrieve the configured Rabbly AI Tutor system instruction prompt,
    customized with the active curriculum topic, modules, notes, and questions.

    Args:
        curriculum_data: Optional dictionary containing the curriculum plan.

    Returns:
        str: The complete system prompt string.
    """
    base_prompt = SYSTEM_TUTOR_PROMPT
    if curriculum_data:
        curriculum_section = build_curriculum_instructions(curriculum_data)
        return f"{base_prompt}\n\n{curriculum_section}"
    return base_prompt
