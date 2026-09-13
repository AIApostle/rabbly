"""
Curriculum Generation & Library Service
Uses OpenRouter LLM or intelligent structured heuristics to generate multi-part
pedagogical learning modules, key takeaways, comprehensive lecture notes, and source materials.
Automatically saves every generated curriculum session into Supabase (and in-memory fallback).
"""

import os
import json
import uuid
import re
import urllib.request
import urllib.error
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from src.schemas.curriculum import (
    CurriculumGenerateRequest,
    CurriculumModule,
    CurriculumPlanResponse,
    SourceMaterial,
)
from src.schemas.profile import UserProfile
from src.schemas.session import SessionCreate
from src.auth.client import get_supabase_admin_client
from src.services.sessions import (
    create_session,
    get_session_by_code,
    get_session_by_id,
    list_user_sessions,
)
from src.pages.recent_sessions import _memory_sessions


OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions"
DEFAULT_MODEL = "google/gemini-2.5-flash"


def _is_supabase_ready() -> bool:
    return bool(os.getenv("SUPABASE_URL") and os.getenv("SUPABASE_ANON_KEY"))


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
        "5. lectureNotes: comprehensive, publication-grade lecture notes (NOT just headlines!). A structured array of 6-8 deep Markdown-formatted study sections. MUST include:\n"
        "   - Deep Conceptual Framework & Core Invariants\n"
        "   - Formal Mathematical Models, Formulas, and Exact Equations\n"
        "   - Clear ASCII Architecture / Dataflow Schemas\n"
        "   - Step-by-Step Numerical or Algorithmic Worked Trace\n"
        "   - Common Pitfalls, Edge Cases & Failure Modes\n"
        "   - High-Scale Performance Considerations & Synthesis Summary\n"
        "6. sourceMaterials: list of 3-4 authoritative reference sources (canonical research papers, landmark textbooks, standard technical documentation, or specifications). Each item MUST have:\n"
        "   - title: citation title (e.g. 'Attention Is All You Need (Vaswani et al., 2017)')\n"
        "   - type: 'paper' | 'book' | 'documentation' | 'article'\n"
        "   - detail: publication venue, year, or authors\n"
        "   - url: arXiv / DOI / doc URL if known or web address\n"
        "   - snippet: 1-2 sentence annotation explaining why this is a primary reference.\n"
        "7. suggestedQuestions: 3 insightful questions a student would ask to test or deepen understanding.\n\n"
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
        with urllib.request.urlopen(req, timeout=20) as response:
            result = json.loads(response.read().decode("utf-8"))
            content = result["choices"][0]["message"]["content"]
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

    # Inferred academic domain
    inferred_subject = subject or "Computer Science"
    canonical_sources: List[Dict[str, Any]] = []

    if any(k in topic_lower for k in ["math", "calculus", "linear", "algebra", "geometry", "trig"]):
        inferred_subject = "Mathematics"
        canonical_sources = [
            {
                "title": "Gilbert Strang, 'Introduction to Linear Algebra' (5th Edition)",
                "type": "book",
                "detail": "Wellesley-Cambridge Press",
                "snippet": "Definitive pedagogical reference establishing geometric intuition for vector spaces and linear mappings.",
            },
            {
                "title": "3Blue1Brown, 'Essence of Linear Algebra'",
                "type": "documentation",
                "detail": "Educational Visual Mathematics Series",
                "snippet": "Visual and geometric foundations for basis vectors, transformations, and determinants.",
            },
        ]
    elif any(k in topic_lower for k in ["physics", "quantum", "gravity", "energy", "wave", "bell"]):
        inferred_subject = "Physics"
        canonical_sources = [
            {
                "title": "J.S. Bell, 'On the Einstein Podolsky Rosen Paradox' (1964)",
                "type": "paper",
                "detail": "Physics Physique Fizika 1, 195",
                "url": "https://cds.cern.ch/record/111654/files/vol1p195-200_001.pdf",
                "snippet": "The seminal paper deriving Bell inequalities, proving quantum mechanics cannot be explained by local hidden variable theories.",
            },
            {
                "title": "Nielsen & Chuang, 'Quantum Computation and Quantum Information'",
                "type": "book",
                "detail": "Cambridge University Press",
                "snippet": "The standard comprehensive textbook on quantum states, gates, entanglement, and information theory.",
            },
        ]
    elif any(k in topic_lower for k in ["attention", "transformer", "llm", "gpt", "bert", "neural"]):
        inferred_subject = "AI & Machine Learning"
        canonical_sources = [
            {
                "title": "Vaswani et al., 'Attention Is All You Need' (2017)",
                "type": "paper",
                "detail": "NeurIPS 2017 / arXiv:1706.03762",
                "url": "https://arxiv.org/abs/1706.03762",
                "snippet": "Original publication introducing the Transformer architecture, replacing recurrent models with multi-head self-attention.",
            },
            {
                "title": "Jay Alammar, 'The Illustrated Transformer'",
                "type": "documentation",
                "detail": "Visual ML Education",
                "url": "https://jalammar.github.io/illustrated-transformer/",
                "snippet": "Visual step-by-step breakdown of query, key, value matrix multiplication and encoder-decoder stacks.",
            },
        ]
    elif any(k in topic_lower for k in ["system", "database", "redis", "scale", "api", "network"]):
        inferred_subject = "Systems Engineering"
        canonical_sources = [
            {
                "title": "Martin Kleppmann, 'Designing Data-Intensive Applications'",
                "type": "book",
                "detail": "O'Reilly Media",
                "snippet": "Authoritative guide on replication, partition strategies, consensus protocols, and distributed transactions.",
            },
            {
                "title": "Donne Martin, 'The System Design Primer'",
                "type": "documentation",
                "detail": "Open Source Engineering Resource",
                "url": "https://github.com/donnemartin/system-design-primer",
                "snippet": "Architectural blueprints and trade-off matrices for high-concurrency distributed systems.",
            },
        ]
    else:
        canonical_sources = [
            {
                "title": f"Standard Academic Reference for {clean_topic}",
                "type": "documentation",
                "detail": "Curated Educational Foundation",
                "snippet": "Core theoretical frameworks, axioms, and established empirical observations in this field.",
            }
        ]

    # Generate 4 progressive modules tailored to the topic
    modules = [
        {
            "id": "m1",
            "title": f"1. Foundations & Problem Intuition: {clean_topic[:32]}",
            "duration": "4 min",
            "status": "in-progress",
            "description": f"Deconstructing the core problem that motivated {clean_topic}, historical context, and baseline assumptions.",
            "keyTakeaways": [
                f"Why traditional solutions proved inadequate prior to {clean_topic}.",
                "The primary conceptual breakthrough and paradigm shift.",
            ],
        },
        {
            "id": "m2",
            "title": "2. Structural Architecture & Core Mechanics",
            "duration": "5 min",
            "status": "upcoming",
            "description": "Step-by-step structural breakdown, mathematical formulation, and internal data flow.",
            "keyTakeaways": [
                "Component interaction and invariant properties.",
                "Formal definitions and mathematical transformations.",
            ],
        },
        {
            "id": "m3",
            "title": "3. Concrete Implementation & Worked Walkthrough",
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
            "description": "High-level summary, future implications, performance guarantees, and interactive student inquiry.",
            "keyTakeaways": [
                "Summary of key invariants and best practices.",
                "How to reason about failure modes under non-ideal conditions.",
            ],
        },
    ]

    notes = [
        f"### 1. Conceptual Framework & Core Invariants\n"
        f"**Topic**: {clean_topic} ({level} Track)\n"
        f"- **Primary Invariant**: Every atomic transformation in {clean_topic} must preserve structural correctness and state consistency.\n"
        f"- **Mental Model**: Treat the workflow as a deterministic state machine where each transition can be validated against boundary rules before committing.",

        "### 2. Formal Mathematical Definition & Equations\n"
        "Let the input parameter state space be defined as $\\mathcal{S}$. The transition function is formulated as:\n"
        "$$\\mathcal{T}: \\mathcal{S} \\times \\mathcal{C} \\longrightarrow \\mathcal{S}' \\quad \\text{such that} \\quad \\forall s \\in \\mathcal{S}, \\; \\mathcal{V}(s) = 1$$\n"
        "Where $\\mathcal{C}$ denotes contextual constraints and $\\mathcal{V}$ is the invariant validator predicate.",

        "### 3. Structural Architecture & Execution Flow\n"
        "```\n"
        "  [Input Data Space] ─────────────┐\n"
        "          │                       ▼\n"
        "          ▼             ┌───────────────────┐\n"
        "  [Normalization Layer] │ Spatial Canvas    │\n"
        "          │             │ Invariants Engine │\n"
        "          ▼             └───────────────────┘\n"
        "  [Execution Pipeline] ───────────▲\n"
        "          │                       │\n"
        "          ▼                       │\n"
        "  [Verified Synthesis Result] ────┘\n"
        "```\n"
        "*Figure 1: High-throughput end-to-end processing pipeline.*",

        f"### 4. Step-by-Step Worked Walkthrough ({clean_topic})\n"
        "1. **Initialization**: Configure baseline environment and establish clean coordinate system bounds.\n"
        "2. **Constraint Verification**: Audit input preconditions to ensure non-null operands and well-formed invariants.\n"
        "3. **Execution & Trace**: Pass verified states through the primary transformation kernel.\n"
        "4. **Post-condition Evaluation**: Assert that output energy/complexity bounds remain strictly within asymptotic guarantees.",

        "### 5. Critical Edge Cases & Common Failure Modes\n"
        "- **Under-specified Preconditions**: Unchecked boundary inputs can propagate silent errors across downstream modules.\n"
        "- **Asymmetric Latency / Concurrency**: Racing state updates without atomic synchronizers can corrupt the invariant ledger.\n"
        "- **Resource Leaks**: Incomplete lifecycle cleanup may degrade long-running runtime sessions.",

        "### 6. Production Synthesis & Practical Best Practices\n"
        "- **Automated Checkpointing**: Persist state snapshots at each module boundary to enable seamless recovery.\n"
        "- **Telemetry & Validation**: Maintain active metric logging for operational visibility under real-world conditions."
    ]

    questions = [
        f"What is the single most critical trade-off when implementing {clean_topic[:30]}?",
        f"How does the {level} mental model differ from a naive first-principles perspective?",
        f"What happens if an unexpected boundary failure occurs during execution?",
    ]

    return {
        "overview": f"A comprehensive {level.lower()}-level mastery roadmap for {clean_topic}, breaking down core principles, structural mechanics, and practical applications.",
        "subject": inferred_subject,
        "estimatedMinutes": 16,
        "modules": modules,
        "lectureNotes": notes,
        "sourceMaterials": canonical_sources,
        "suggestedQuestions": questions,
    }


def generate_curriculum(
    request: CurriculumGenerateRequest,
    user: Optional[UserProfile] = None,
) -> CurriculumPlanResponse:
    """
    Main generation entrypoint:
    1. Generates modules, key takeaways, lecture notes, and source materials using LLM (or heuristic fallback).
    2. Merges user-attached resources into source materials.
    3. Persists the complete session to Supabase database (and in-memory fallback).
    """
    api_key = os.getenv("OPENROUTER_API_KEY", "").strip().strip('"').strip("'")
    plan_data = None

    # Format attached user resources
    user_sources: List[SourceMaterial] = []
    resources_summary_list = []
    if request.resources:
        for r in request.resources:
            resources_summary_list.append(f"[{r.type.upper()}] {r.title} ({r.detail or ''})")
            user_sources.append(
                SourceMaterial(
                    id=r.id or f"user-res-{uuid.uuid4().hex[:6]}",
                    title=r.title,
                    type=r.type,
                    detail=r.detail or f"Attached {r.type}",
                    url=r.url,
                    snippet=r.content or f"Uploaded student reference: {r.title}",
                )
            )

    resources_summary = "; ".join(resources_summary_list)

    # Attempt LLM generation if API key is present
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

    # Fallback heuristic generator
    if not plan_data or not isinstance(plan_data, dict) or "modules" not in plan_data:
        plan_data = _generate_fallback_plan(
            topic=request.topic,
            level=request.level,
            subject=request.subject,
        )

    # Reconstitute modules
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

    # Reconstitute source materials: merge AI canonical sources + attached user files/links
    sources: List[SourceMaterial] = list(user_sources)
    for raw_s in plan_data.get("sourceMaterials", []):
        sources.append(
            SourceMaterial(
                id=raw_s.get("id") or f"src-{uuid.uuid4().hex[:6]}",
                title=raw_s.get("title", "Reference Resource"),
                type=raw_s.get("type", "paper"),
                detail=raw_s.get("detail"),
                url=raw_s.get("url"),
                snippet=raw_s.get("snippet"),
            )
        )

    lesson_id = f"lesson-{uuid.uuid4().hex[:8]}"
    room_code = (request.room_code.strip() if request.room_code else None) or f"RAB-{uuid.uuid4().hex[:4].upper()}"
    now_iso = datetime.now(timezone.utc).isoformat()

    curriculum_response = CurriculumPlanResponse(
        id=lesson_id,
        session_id=lesson_id,
        room_code=room_code,
        topic=request.topic,
        overview=plan_data.get("overview", f"Curriculum for {request.topic}"),
        subject=plan_data.get("subject", request.subject or "General Study"),
        level=request.level,
        estimatedMinutes=plan_data.get("estimatedMinutes", 16),
        modules=modules,
        lectureNotes=plan_data.get("lectureNotes", []),
        sourceMaterials=sources,
        suggestedQuestions=plan_data.get("suggestedQuestions", []),
        created_at=now_iso,
    )

    # -------------------------------------------------------------------------
    # Supabase & In-Memory Persistence
    # -------------------------------------------------------------------------
    host_id = user.id if user and user.id else None
    serialized_plan = curriculum_response.model_dump()

    session_payload = SessionCreate(
        topic=request.topic,
        subject=curriculum_response.subject,
        level=request.level,
        is_classroom=False,
        room_code=room_code,
        host_id=host_id,
        completed_modules=0,
        total_modules=len(modules),
        progress_percent=0,
        has_external_resources=len(sources) > 0,
        resource_name=sources[0].title if sources else None,
        board_state={"curriculum_plan": serialized_plan},
    )

    # 1. Save to Supabase if credentials are available
    if _is_supabase_ready():
        try:
            client = get_supabase_admin_client()
            db_session = create_session(client, session_payload)
            if db_session:
                curriculum_response.session_id = db_session.id
                curriculum_response.room_code = db_session.room_code
        except Exception as db_err:
            print(f"[CurriculumService] Supabase session persistence failed: {db_err}")

    # 2. Save to in-memory fallback store
    _memory_sessions[room_code] = {
        "id": curriculum_response.session_id or lesson_id,
        "room_code": room_code,
        "host_id": host_id,
        "topic": request.topic,
        "subject": curriculum_response.subject,
        "level": request.level,
        "is_classroom": False,
        "status": "active",
        "last_checkpoint": modules[0].title if modules else "1. Foundation",
        "completed_modules": 0,
        "total_modules": len(modules),
        "progress_percent": 0,
        "has_external_resources": len(sources) > 0,
        "resource_name": sources[0].title if sources else None,
        "board_state": {"curriculum_plan": serialized_plan},
        "created_at": now_iso,
        "updated_at": now_iso,
    }

    return curriculum_response


def list_user_library(user: Optional[UserProfile] = None, limit: int = 50) -> List[CurriculumPlanResponse]:
    """
    Retrieves all past curricula, modules, notes, and source materials
    saved for the user across different sessions from Supabase and memory.
    """
    library: List[CurriculumPlanResponse] = []
    seen_ids = set()

    # 1. Query Supabase
    if _is_supabase_ready():
        try:
            client = get_supabase_admin_client()
            if user and user.id:
                sessions = list_user_sessions(client, user.id, limit=limit)
            else:
                # Public/anonymous fallback sessions
                from src.services.sessions import list_all_sessions
                sessions = list_all_sessions(client, limit=limit)

            for sess in sessions:
                board_state = getattr(sess, "board_state", None) or {}
                plan_dict = board_state.get("curriculum_plan")
                if plan_dict and isinstance(plan_dict, dict):
                    plan_obj = CurriculumPlanResponse(**plan_dict)
                    if plan_obj.id not in seen_ids:
                        seen_ids.add(plan_obj.id)
                        library.append(plan_obj)
        except Exception as err:
            print(f"[CurriculumService] Failed to query Supabase library: {err}")

    # 2. Query in-memory session store
    mem_sessions = list(_memory_sessions.values())
    if user and user.id:
        mem_sessions = [s for s in mem_sessions if s.get("host_id") == user.id or s.get("host_id") is None]

    for s in mem_sessions:
        board_state = s.get("board_state", {})
        plan_dict = board_state.get("curriculum_plan")
        if plan_dict and isinstance(plan_dict, dict):
            try:
                plan_obj = CurriculumPlanResponse(**plan_dict)
                if plan_obj.id not in seen_ids:
                    seen_ids.add(plan_obj.id)
                    library.append(plan_obj)
            except Exception:
                pass
        else:
            # Reconstruct basic library item from session record if no curriculum_plan was saved
            sess_id = s.get("id", f"sess-{uuid.uuid4().hex[:6]}")
            if sess_id not in seen_ids:
                seen_ids.add(sess_id)
                library.append(
                    CurriculumPlanResponse(
                        id=sess_id,
                        session_id=sess_id,
                        room_code=s.get("room_code"),
                        topic=s.get("topic", "General Lesson"),
                        overview=f"Session covering {s.get('topic', 'topics')} ({s.get('level', 'Intermediate')} Level)",
                        subject=s.get("subject", "General Study"),
                        level=s.get("level", "Intermediate"),
                        estimatedMinutes=15,
                        modules=[
                            CurriculumModule(
                                id="m1",
                                title=s.get("last_checkpoint", "1. Foundation & Intuition"),
                                duration="5 min",
                                status="completed" if s.get("status") == "completed" else "in-progress",
                                description=f"Progress checkpoint for {s.get('topic')}.",
                                keyTakeaways=["Core concepts deconstructed in active session."],
                            )
                        ],
                        lectureNotes=[
                            f"**Topic**: {s.get('topic')}",
                            f"**Room Code**: {s.get('room_code')}",
                            f"**Recorded Checkpoint**: {s.get('last_checkpoint')}",
                        ],
                        sourceMaterials=[],
                        created_at=s.get("created_at"),
                    )
                )

    return library[:limit]


def get_curriculum_plan_for_session(session_id: str) -> Optional[dict]:
    """
    Retrieve the full curriculum plan dictionary for a given session ID or room code.
    Checks memory session store first, then Supabase database.
    """
    if not session_id:
        return None

    # 1. Check in-memory store by room_code or session ID
    if session_id in _memory_sessions:
        board_state = _memory_sessions[session_id].get("board_state", {})
        plan = board_state.get("curriculum_plan")
        if plan and isinstance(plan, dict):
            return plan

    for s in _memory_sessions.values():
        if s.get("id") == session_id or s.get("room_code") == session_id:
            board_state = s.get("board_state", {})
            plan = board_state.get("curriculum_plan")
            if plan and isinstance(plan, dict):
                return plan

    # 2. Check Supabase
    if _is_supabase_ready():
        try:
            client = get_supabase_admin_client()
            db_session = None
            if session_id.startswith("RAB-"):
                db_session = get_session_by_code(client, session_id)
            if not db_session:
                db_session = get_session_by_id(client, session_id)

            if db_session:
                board_state = getattr(db_session, "board_state", None) or {}
                plan = board_state.get("curriculum_plan")
                if plan and isinstance(plan, dict):
                    return plan
        except Exception as err:
            print(f"[CurriculumService] Error fetching curriculum plan for session {session_id}: {err}")

    return None

