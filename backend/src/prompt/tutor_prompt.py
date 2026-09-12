"""
System Prompts and Pedagogical Instructions for Rabbly AI Tutor.

This module houses the core personas, conversational instructions, pedagogical guidelines,
and whiteboard layout directives for the Gemini Live agent.
"""
from typing import Optional

SYSTEM_TUTOR_PROMPT = """You are Rabbly, an energetic live AI STEM teacher.
You teach students at an interactive digital blackboard in real time with two-way voice and synchronized visual illustrations.
You have 15 real-time blackboard tools: write_text, write_formula, draw_geometry, create_shape, create_sticky_note, draw_connector, update_shape, delete_shapes, align_shapes, distribute_shapes, reorder_shapes, set_camera, clear_board, get_board_state.

Teaching Guidelines:
1. Active Live Teacher: Greet the student warmly, introduce concepts with intuition, and teach step-by-step.
2. Synchronized Speech & Visuals: Whenever you introduce, explain, or derive a concept, theorem, or equation, you MUST immediately call your whiteboard tools to draw the diagrams and write the formulas on the blackboard while speaking naturally.
3. Natural Conversational Tone: Speak directly to the student as if standing at a chalkboard. Never recite internal tool syntax, parameter names, or planning headers in your spoken voice.

Spatial Layout (1280x720 Canvas):
- Title / Header: (x: 80, y: 50) using write_text (size='l', color='violet').
- Left Quadrant (x: 80-480, y: 120-550): Geometric diagrams (draw_geometry) and shapes (create_shape).
- Right Quadrant (x: 540-1150, y: 120-550): Formulas (write_formula) and key takeaways (create_sticky_note).
- Topic Transitions: When starting a brand new topic or module, call clear_board to start with a fresh canvas."""


def build_curriculum_instructions(curriculum_data: Optional[dict]) -> str:
    """
    Formats an active curriculum plan into structured pedagogical guidelines,
    ensuring the agent knows the topic, module roadmap, lecture notes, key formulas,
    and checkpoint questions.
    """
    if not curriculum_data or not isinstance(curriculum_data, dict):
        return ""

    topic = curriculum_data.get("topic") or "STEM & Mathematics"
    subject = curriculum_data.get("subject") or "General Study"
    level = curriculum_data.get("level") or "High School"
    overview = curriculum_data.get("overview") or f"Interactive session on {topic}."

    lines = [
        "\n---",
        "## Active Teaching Assignment & Curriculum:",
        f"- **Primary Topic**: {topic}",
        f"- **Academic Field**: {subject}",
        f"- **Target Difficulty**: {level}",
        f"- **Lesson Overview**: {overview}\n",
    ]

    # Modules
    modules = curriculum_data.get("modules") or []
    if modules:
        lines.append("### Module Roadmap (Teach sequentially, guiding the student through each):")
        for idx, m in enumerate(modules, start=1):
            if isinstance(m, dict):
                title = m.get("title", f"Module {idx}")
                duration = m.get("duration", "")
                desc = m.get("description", "")
                takeaways = m.get("keyTakeaways", [])
                lines.append(f"{idx}. **{title}** ({duration}): {desc}")
                if takeaways:
                    lines.append(f"   - Key Takeaways: {', '.join(takeaways)}")
        lines.append("")

    # Lecture Notes & Formulas
    notes = curriculum_data.get("lectureNotes") or []
    if notes:
        lines.append("### Prepared Lecture Notes & Key Formulas (Illustrate and write these on the blackboard):")
        for n in notes:
            lines.append(f"- {n}")
        lines.append("")

    # Checkpoint Questions
    questions = curriculum_data.get("suggestedQuestions") or []
    if questions:
        lines.append("### Discussion & Checkpoint Questions (Ask these Socratically to verify understanding):")
        for q in questions:
            lines.append(f"- \"{q}\"")
        lines.append("")

    lines.append("### Pedagogical Execution & Mandatory Whiteboard Drawing:")
    lines.append(f"1. Begin immediately with '{topic}' and introduce Module 1.")
    lines.append("2. Proactively use your whiteboard tools (`write_text`, `write_formula`, `draw_geometry`, `create_sticky_note`) to build the lesson visually as you speak.")
    lines.append("3. For every formula in the lecture notes, execute `write_formula`. For every shape or diagram, execute `draw_geometry` or `create_shape`.")
    lines.append("4. Ask checkpoint questions Socratically to verify understanding before proceeding.")
    lines.append("5. When transitioning to a new module, execute `clear_board` to start with a fresh canvas.")
    lines.append("---\n")

    return "\n".join(lines)


def build_initial_greeting_prompt(curriculum_data: Optional[dict] = None) -> str:
    """
    Constructs the initial spoken greeting prompt from the student perspective,
    prompting the live teacher to introduce the lesson and immediately illustrate
    the opening concepts on the blackboard.
    """
    if not curriculum_data or not isinstance(curriculum_data, dict) or not curriculum_data.get("topic"):
        return (
            "Hi Rabbly! I am ready to begin our live STEM lesson. Please introduce yourself and write a welcome message on the blackboard now."
        )

    topic = curriculum_data.get("topic")
    modules = curriculum_data.get("modules") or []
    first_module = "Module 1"
    if modules and isinstance(modules[0], dict):
        first_module = modules[0].get("title", "Module 1")

    return (
        f"Hi Rabbly! I am ready to learn about {topic}. Please introduce yourself, announce today's topic, and draw the opening concepts for {first_module} on the blackboard now."
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
