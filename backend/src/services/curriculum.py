"""
Curriculum Generation Service
Uses OpenRouter LLM or intelligent structured heuristics to generate multi-part
pedagogical learning modules, key takeaways, and comprehensive lecture notes.
"""

import os
import json
import uuid
import re
import urllib.request
import urllib.error
from typing import Any, Dict, List, Optional

from src.schemas.curriculum import (
    CurriculumGenerateRequest,
    CurriculumModule,
    CurriculumPlanResponse,
)


OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions"
DEFAULT_MODEL = "google/gemini-2.5-flash"


def _generate_with_openrouter(
    api_key: str,
    prompt: str,
    level: str,
    subject: Optional[str] = None,
    resources_summary: str = "",
) -> Optional[Dict[str, Any]]:
    """Calls OpenRouter API to generate curriculum JSON."""
    system_prompt = (
        "You are Rabbly, an expert pedagogical curriculum designer. "
        "Given a topic prompt and learner difficulty level, generate a structured educational plan with:\n"
        "1. overview: 1-2 sentence executive overview.\n"
        "2. subject: category (e.g., Computer Science, Mathematics, Physics, Biology, History, Philosophy, General).\n"
        "3. estimatedMinutes: realistic duration (12-25 mins).\n"
        "4. modules: exactly 3 to 4 progressive sequential modules. Each module MUST have:\n"
        "   - id: unique string e.g. 'm1', 'm2'\n"
        "   - title: numbered descriptive title (e.g. '1. Foundations & Intuition')\n"
        "   - duration: e.g. '4 min'\n"
        "   - status: 'in-progress' for the first module, 'upcoming' for the rest\n"
        "   - description: 2-3 sentences explaining what this module covers and why\n"
        "   - keyTakeaways: list of 2-3 crisp bullet points\n"
        "5. lectureNotes: list of 5-8 detailed lecture note items. Include formulas, bullet summaries, and clear ASCII or text diagrams where appropriate.\n"
        "6. suggestedQuestions: 3 insightful questions a student would ask to test or deepen understanding.\n\n"
        "OUTPUT FORMAT: Return ONLY valid JSON matching this exact structure without markdown backticks or commentary."
    )

    user_content = f"Topic: {prompt}\nTarget Level: {level}"
    if subject:
        user_content += f"\nSubject Category: {subject}"
    if resources_summary:
        user_content += f"\nAttached Context / References: {resources_summary}"

    payload = {
        "model": os.getenv("OPENROUTER_MODEL", DEFAULT_MODEL),
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_content},
        ],
        "temperature": 0.4,
        "response_format": {"type": "json_object"},
    }

    req = urllib.request.Request(
        OPENROUTER_ENDPOINT,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "http://localhost:5174",
            "X-Title": "Rabbly AI Tutor",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=18) as response:
            result = json.loads(response.read().decode("utf-8"))
            content = result["choices"][0]["message"]["content"]
            # Clean possible markdown wrap
            cleaned = re.sub(r"^```json\s*", "", content.strip(), flags=re.MULTILINE)
            cleaned = re.sub(r"\s*```$", "", cleaned, flags=re.MULTILINE)
            return json.loads(cleaned)
    except Exception as e:
        print(f"[CurriculumService] OpenRouter call failed: {e}. Using heuristic fallback.")
        return None


def _generate_fallback_plan(
    topic: str,
    level: str,
    subject: Optional[str] = None,
) -> Dict[str, Any]:
    """Provides high-quality structured curriculum when offline or API call is unavailable."""
    clean_topic = topic.strip()
    topic_lower = clean_topic.lower()

    # Determine domain
    inferred_subject = subject or "Computer Science"
    if any(k in topic_lower for k in ["math", "calculus", "linear", "algebra", "geometry", "trig"]):
        inferred_subject = "Mathematics"
    elif any(k in topic_lower for k in ["physics", "quantum", "gravity", "energy", "wave"]):
        inferred_subject = "Physics"
    elif any(k in topic_lower for k in ["bio", "cell", "dna", "photosynthesis", "neuron"]):
        inferred_subject = "Biology"
    elif any(k in topic_lower for k in ["history", "war", "revolution", "empire", "century"]):
        inferred_subject = "History"
    elif any(k in topic_lower for k in ["system", "database", "redis", "scale", "api", "network"]):
        inferred_subject = "Systems Engineering"

    # Generate 4 progressive modules tailored to the topic
    modules = [
        {
            "id": "m1",
            "title": f"1. Foundations & Intuition of {clean_topic[:35]}",
            "duration": "4 min",
            "status": "in-progress",
            "description": f"Deconstructing the core problem that motivated {clean_topic}, historical context, and foundational intuition.",
            "keyTakeaways": [
                f"Why traditional approaches fell short prior to {clean_topic}.",
                "The primary conceptual breakthrough and paradigm shift.",
            ],
        },
        {
            "id": "m2",
            "title": "2. Core Architecture & Mathematical Mechanics",
            "duration": "5 min",
            "status": "upcoming",
            "description": "Step-by-step structural breakdown, mathematical formulation, and internal data flow.",
            "keyTakeaways": [
                "Detailed schematic breakdown of participating components.",
                "How inputs are mapped and transformed into verifiable outputs.",
            ],
        },
        {
            "id": "m3",
            "title": "3. Worked Example & Real-World Implementation",
            "duration": "4 min",
            "status": "upcoming",
            "description": f"Tracing a concrete walkthrough applying {clean_topic} to an end-to-end scenario.",
            "keyTakeaways": [
                "Concrete step-by-step execution trace.",
                "Common bottlenecks, trade-offs, and boundary edge cases.",
            ],
        },
        {
            "id": "m4",
            "title": "4. Synthesis, Advanced Trade-offs & Q&A",
            "duration": "3 min",
            "status": "upcoming",
            "description": "High-level summary, future implications, performance guarantees, and interactive student questions.",
            "keyTakeaways": [
                "Summary of key invariants and best practices.",
                "How to reason about failure modes under non-ideal conditions.",
            ],
        },
    ]

    # Generate rich lecture notes
    notes = [
        f"**Core Invariant**: {clean_topic} is designed to guarantee correctness while minimizing latency and cognitive complexity.",
        f"**Level of Rigor**: Calibrated for {level} proficiency, prioritizing structural clarity and mental models.",
        "**System Architecture Diagram**:\n```\n[Input Context] ───> [Transformation Engine] ───> [Evaluation / Verification]\n        │                          │\n        └─── [State Constraints] ──┘\n```",
        "**Mathematical Definition / Schema**: Formalizes relationship f(x) -> y where each intermediate representation preserves structural consistency.",
        "**Critical Edge Case**: Pay special attention to boundary conditions where assumptions break down or scale constraints apply.",
    ]

    # Generate suggested questions
    questions = [
        f"What is the single most critical trade-off when implementing {clean_topic[:30]} in production?",
        f"How does the {level} mental model differ from a naive first-principles perspective?",
        f"What happens if an unexpected boundary failure occurs during the transformation step?",
    ]

    return {
        "overview": f"A comprehensive {level.lower()}-level mastery roadmap for {clean_topic}, breaking down core principles, structural mechanics, and practical applications.",
        "subject": inferred_subject,
        "estimatedMinutes": 16,
        "modules": modules,
        "lectureNotes": notes,
        "suggestedQuestions": questions,
    }


def generate_curriculum(request: CurriculumGenerateRequest) -> CurriculumPlanResponse:
    """
    Main entrypoint: Generates curriculum plan using OpenRouter LLM with
    automatic heuristic fallback.
    """
    api_key = os.getenv("OPENROUTER_API_KEY", "").strip().strip('"').strip("'")
    plan_data = None

    # Summarize any attached resources
    resources_summary = ""
    if request.resources:
        items = []
        for r in request.resources:
            items.append(f"[{r.type.upper()}] {r.title} - {r.detail or ''} {r.content or ''}")
        resources_summary = "; ".join(items)

    # Attempt LLM generation if API key exists
    if api_key and api_key.startswith("sk-"):
        try:
            plan_data = _generate_with_openrouter(
                api_key=api_key,
                prompt=request.topic,
                level=request.level,
                subject=request.subject,
                resources_summary=resources_summary,
            )
        except Exception as err:
            print(f"[CurriculumService] Generation error: {err}")
            plan_data = None

    # Fallback if LLM was unavailable or produced invalid output
    if not plan_data or not isinstance(plan_data, dict) or "modules" not in plan_data:
        plan_data = _generate_fallback_plan(
            topic=request.topic,
            level=request.level,
            subject=request.subject,
        )

    # Format modules
    raw_modules = plan_data.get("modules", [])
    modules: List[CurriculumModule] = []
    for idx, m in enumerate(raw_modules):
        modules.append(
            CurriculumModule(
                id=m.get("id") or f"m{idx + 1}",
                title=m.get("title", f"Module {idx + 1}"),
                duration=m.get("duration", "4 min"),
                status=m.get("status", "in-progress" if idx == 0 else "upcoming"),
                description=m.get("description", ""),
                keyTakeaways=m.get("keyTakeaways", []),
            )
        )

    lesson_id = f"lesson-{uuid.uuid4().hex[:8]}"

    return CurriculumPlanResponse(
        id=lesson_id,
        topic=request.topic,
        overview=plan_data.get("overview", f"Curriculum for {request.topic}"),
        subject=plan_data.get("subject", request.subject or "General Study"),
        level=request.level,
        estimatedMinutes=plan_data.get("estimatedMinutes", 16),
        modules=modules,
        lectureNotes=plan_data.get("lectureNotes", []),
        suggestedQuestions=plan_data.get("suggestedQuestions", []),
    )
