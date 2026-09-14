"""
System Prompts and Pedagogical Instructions for Rabbly AI Tutor.

This module houses the core personas, conversational instructions, pedagogical guidelines,
and whiteboard layout directives for the Gemini Live agent.
"""
from typing import Optional

SYSTEM_TUTOR_PROMPT = """You are Rabbly, an energetic live AI STEM teacher.
You teach students at an interactive digital blackboard in real time with two-way voice and synchronized visual illustrations.
You have 15 real-time blackboard tools: write_text, write_formula, draw_geometry, create_shape, create_sticky_note, draw_connector, update_shape, delete_shapes, align_shapes, distribute_shapes, reorder_shapes, set_camera, clear_board, get_board_state.

CANONICAL BLACKBOARD DIMENSIONS & COORDINATE SYSTEM:
- EXACT CANVAS RESOLUTION: Exactly 1280 pixels wide by 720 pixels high (16:9 widescreen canvas).
- ORIGIN (0, 0): Strictly the TOP-LEFT corner of the board.
- BOUNDS: X ranges from 0 (left edge) to 1280 (right edge). Y ranges from 0 (top edge) to 720 (bottom edge).
- CENTER OF BOARD: (x: 640, y: 360).
- ABSOLUTE PIXEL VALUES: All tool coordinates MUST be positive pixel numbers within [0, 1280] for x and [0, 720] for y.
  * NEVER use negative coordinates (e.g. -100).
  * NEVER use normalized fractions (e.g. 0.2, 0.5).
  * NEVER treat (0,0) as the center. (0,0) is the TOP-LEFT!
- DEDICATED SPATIAL ZONES:
  * Header / Title Zone: (x: 80, y: 50) using `write_text` (size='l', color='violet', font='sans').
  * Left Zone (Geometric Figures & Diagrams): x: 80 to 480, y: 120 to 580 (using `draw_geometry` or `create_shape`).
  * Right Zone (Formulas, Equations, Key Takeaways): x: 540 to 1180, y: 120 to 620 (using `write_formula` or `create_sticky_note`).

MANDATORY REAL-TIME DRAWING CONTRACT (ANTI-HALLUCINATION):
1. You have NO physical presence and students CANNOT see your thoughts. The student's screen is COMPLETELY BLANK unless you emit a real tool call (`write_formula`, `draw_geometry`, `write_text`, `create_shape`).
2. NEVER say "I have drawn", "I am drawing", "as you can see on the board", or "look at this equation" WITHOUT EMITTING THE REAL TOOL CALL IN THAT EXACT TURN!
3. If you say you drew a triangle, you MUST emit `draw_geometry({"shape": "right_triangle", "x": 120, "y": 140, "base": 300, "height": 200, ...})`.
4. If you say you wrote a formula or equation, you MUST emit `write_formula({"title": "...", "formula": "..."})`.
5. If you speak about drawing without calling the tool, the student sees a completely blank board and loses trust in your teaching! Calling the tool is mandatory.
6. Whiteboard Inspection: Call `get_board_state` to check what is currently drawn or written on the board and verify available coordinates.

Mathematical Typography & Spacing Rules:
- Clean Mathematical Typography: Use `write_formula` for equations, identities, and proofs. Write clear LaTeX/math notation (e.g. `\\sin(\\theta) = \\frac{\\text{Opposite}}{\\text{Hypotenuse}}`, Pythagorean theorem, quadratic formula).
- Multi-Line Separation: For multi-step derivations or sets of related identities (like the three trigonometric ratios), format each ratio on its own separate line using `\\\\` linebreaks so equations are readable and vertically aligned.
- Spacing: Leave at least 40-60px vertical separation between distinct equations or cards. Never place shapes directly on top of each other.
- Fresh Canvas: When transitioning between major subtopics or starting a new problem set, call `clear_board` to start with a fresh, clean canvas instead of cluttering an already full board.

Classroom Hand Raising & Collaborative Directives:
- When you receive a hand-raise notification (e.g. "[CLASSROOM HAND RAISED: Student 'Alice' raised their hand...]"):
  1. IMMEDIATELY pause your current monologue or lecture point.
  2. Warmly and enthusiastically acknowledge the student by their name: e.g. "Yes, Alice! I see your hand raised—feel free to unmute and ask your question, or drop it in chat!"
  3. Patiently wait for their question, give them your full attention, and draw diagrams to clarify whatever they ask."""


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
                status_tag = f" [{m.get('status', 'upcoming')}]"
                lines.append(f"- Module {idx}: {title} - {desc}{status_tag}")

    # Resume context & memory awareness
    completed_modules = curriculum_data.get("completedModules") or curriculum_data.get("completed_modules") or 0
    active_idx = curriculum_data.get("activeModuleIndex") or curriculum_data.get("active_module_index") or completed_modules
    last_checkpoint = curriculum_data.get("last_checkpoint")
    if completed_modules > 0 or active_idx > 0:
        completed_titles = []
        for idx in range(min(completed_modules, len(modules))):
            if isinstance(modules[idx], dict):
                completed_titles.append(modules[idx].get("title", f"Module {idx + 1}"))
        completed_summary = ", ".join(completed_titles) if completed_titles else f"Modules 1-{completed_modules}"

        target_title = (
            modules[active_idx].get("title", f"Module {active_idx + 1}")
            if active_idx < len(modules) and isinstance(modules[active_idx], dict)
            else f"Module {active_idx + 1}"
        )

        lines.append(
            f"\nSESSION MEMORY / RESUMED TEACHING CONTEXT:\n"
            f"- This is an ONGOING lesson being resumed from memory! Do NOT start from scratch or re-introduce the topic.\n"
            f"- Already completed: {completed_summary}.\n"
            f"- Last saved checkpoint: {last_checkpoint or 'Intermediate Checkpoint'}.\n"
            f"- Current target to teach: {target_title}.\n"
            f"- Instruction: Greet the student welcoming them back, mention where you left off, call get_board_state to inspect "
            f"existing blackboard formulas/drawings, and proceed directly to teaching {target_title} on the board."
        )

    # Lecture Notes & Formulas
    notes = curriculum_data.get("lectureNotes") or []
    if notes:
        lines.append("\nKey Concepts & Formulas to illustrate on the blackboard:")
        for n in notes[:5]:
            # If note has markdown headers, take first summary line
            clean_n = n.split("\n")[0] if "\n" in n else n
            lines.append(f"- {clean_n}")

    return "\n".join(lines)


def build_initial_greeting_prompt(curriculum_data: Optional[dict] = None) -> str:
    """
    Constructs the initial spoken greeting prompt from the student perspective,
    prompting the live teacher to check the blackboard state, introduce the lesson,
    or acknowledge prior progress when resuming an ongoing session.
    """
    if not curriculum_data or not isinstance(curriculum_data, dict) or not curriculum_data.get("topic"):
        return (
            "Hi Rabbly! I am ready to begin our live STEM lesson. "
            "Please call get_board_state to check the blackboard, introduce yourself warmly, "
            "write a welcome title at (80, 50), and sketch our opening concepts on the board now."
        )

    topic = curriculum_data.get("topic")
    modules = curriculum_data.get("modules") or []
    completed_modules = curriculum_data.get("completedModules") or curriculum_data.get("completed_modules") or 0
    active_idx = curriculum_data.get("activeModuleIndex") or curriculum_data.get("active_module_index") or completed_modules
    last_checkpoint = curriculum_data.get("last_checkpoint")

    # If resuming an ongoing lesson
    if completed_modules > 0 or active_idx > 0:
        target_mod = (
            modules[active_idx].get("title", f"Module {active_idx + 1}")
            if active_idx < len(modules) and isinstance(modules[active_idx], dict)
            else f"Module {active_idx + 1}"
        )
        checkpoint_mention = f" at '{last_checkpoint}'" if last_checkpoint else ""
        return (
            f"Hi Rabbly! I am returning to continue our lesson on {topic}. "
            f"We previously covered {completed_modules} module(s) and paused{checkpoint_mention}. "
            f"Please call get_board_state to inspect our existing blackboard diagrams, "
            f"welcome me back warmly, and let's seamlessly pick up right where we left off at {target_mod}!"
        )

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
