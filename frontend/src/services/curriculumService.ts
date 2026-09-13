/**
 * Rabbly Curriculum Generation Client Service
 * Dispatches student prompts to the backend LLM engine (/api/curriculum/generate)
 * to generate multi-part sequential curriculum modules and comprehensive lecture notes.
 */

import type { LessonPlan, ExternalResource, CurriculumModule } from '../types';
import { getAuthHeaders } from './authService';
import { getApiUrl } from './apiConfig';

export interface GenerateCurriculumParams {
  topic: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  subject?: string;
  room_code?: string;
  resources?: ExternalResource[];
}

/**
 * Generates an adaptive fallback curriculum plan when the backend is offline or unreachable.
 */
function createFallbackPlan(topic: string, level: string): LessonPlan {
  const cleanTopic = topic.trim() || 'General Study';
  const modules: CurriculumModule[] = [
    {
      id: 'm1',
      title: `1. Foundations & Intuition of ${cleanTopic.slice(0, 35)}`,
      duration: '4 min',
      status: 'in-progress',
      description: `Understanding the problem space, historical context, and primary motivation for ${cleanTopic}.`,
      keyTakeaways: [
        `Core problem statement motivating ${cleanTopic}.`,
        'Fundamental intuitions and baseline assumptions.',
      ],
    },
    {
      id: 'm2',
      title: '2. Structural Architecture & Core Mechanics',
      duration: '5 min',
      status: 'upcoming',
      description: 'Step-by-step deconstruction of the internal components and data flow.',
      keyTakeaways: [
        'Component interaction and invariant properties.',
        'Formal definitions and mathematical transformations.',
      ],
    },
    {
      id: 'm3',
      title: '3. Concrete Implementation & Worked Walkthrough',
      duration: '5 min',
      status: 'upcoming',
      description: 'Tracing a complete scenario end-to-end with real-world inputs.',
      keyTakeaways: [
        'Practical step-by-step trace.',
        'Common boundary pitfalls and optimization points.',
      ],
    },
    {
      id: 'm4',
      title: '4. Advanced Trade-offs, Edge Cases & Q&A',
      duration: '4 min',
      status: 'upcoming',
      description: 'High-level synthesis, performance considerations, and open student inquiry.',
      keyTakeaways: [
        'Summary of design trade-offs and scaling constraints.',
        'Key considerations for mastery and practical application.',
      ],
    },
  ];

  return {
    id: `lesson-${Date.now()}`,
    topic: cleanTopic,
    overview: `A structured ${level.toLowerCase()}-level curriculum designed to build deep conceptual intuition and practical mechanics for ${cleanTopic}.`,
    subject: 'General Study',
    level: level as 'Beginner' | 'Intermediate' | 'Advanced',
    estimatedMinutes: 18,
    modules,
    lectureNotes: [
      `### 1. Conceptual Framework & Core Invariants\n**Topic**: ${cleanTopic} (${level} Level)\n• **Primary Invariant**: Every transformation in ${cleanTopic} preserves structural correctness and semantic consistency.\n• **Mental Model**: Model the domain as deterministic state transitions with verified invariants.`,
      `### 2. Formal Mathematical Models & Equations\nLet parameter state space be $\\mathcal{S}$. State transition:\n$$\\mathcal{T}: \\mathcal{S} \\times \\mathcal{C} \\longrightarrow \\mathcal{S}' \\quad \\text{where} \\quad \\forall s \\in \\mathcal{S}, \\; \\mathcal{V}(s) = 1$$\nWhere $\\mathcal{C}$ denotes contextual constraints and $\\mathcal{V}$ is the invariant validator.`,
      `### 3. Structural Architecture & Execution Flow\n\`\`\`\n[Input Context] ───> [Normalization] ───> [Canvas Invariant Engine]\n        │                                            ▲\n        └─────────────> [Execution Kernel] ──────────┘\n\`\`\`\n*High-throughput deterministic execution pipeline.*`,
      `### 4. Step-by-Step Worked Walkthrough (${cleanTopic})\n1. **Initialization**: Configure baseline environment and canvas coordinate boundaries.\n2. **Invariant Verification**: Check input preconditions to guarantee valid operands.\n3. **Kernel Execution**: Process transformations through the core computational engine.\n4. **Post-condition Assertion**: Validate that execution adheres to asymptotic bounds.`,
      `### 5. Critical Failure Modes & Edge Cases\n• **Boundary Value Leakage**: Always assert non-null state on external inputs.\n• **Concurrency Hazards**: Avoid un-synchronized race conditions across distributed updates.\n• **Resource Exhaustion**: Ensure active listeners and buffers are cleanly disposed.`,
      `### 6. Production Synthesis & Best Practices\n• **State Checkpointing**: Store incremental milestones to enable instant session resumption.\n• **Observability**: Maintain rich operational logging and real-time visual feedback.`,
    ],
    suggestedQuestions: [
      `What is the primary architectural trade-off of ${cleanTopic}?`,
      'How does this approach handle non-standard input variations?',
      'What are the performance implications when scaling to larger datasets?',
    ],
  };
}

/**
 * Calls backend API to generate curriculum modules and lecture notes.
 */
export async function generateCurriculum(params: GenerateCurriculumParams): Promise<LessonPlan> {
  const { topic, level, subject, room_code, resources } = params;

  try {
    const formattedResources = (resources || []).map((r) => ({
      id: r.id,
      type: r.type,
      title: r.title,
      detail: r.detail,
      url: r.url,
      content: r.type === 'file' && r.file ? `File: ${r.file.name} (${(r.file.size / 1024).toFixed(0)} KB)` : undefined,
    }));

    const response = await fetch(getApiUrl('/api/curriculum/generate'), {
      method: 'POST',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        topic,
        level,
        subject,
        room_code,
        resources: formattedResources,
      }),
    });

    if (!response.ok) {
      console.warn(`[CurriculumService] Backend returned ${response.status}. Using intelligent fallback.`);
      return createFallbackPlan(topic, level);
    }

    const data = await response.json();

    // Map response into strict frontend LessonPlan
    const plan: LessonPlan = {
      id: data.id || `lesson-${Date.now()}`,
      session_id: data.session_id,
      room_code: data.room_code,
      topic: data.topic || topic,
      overview: data.overview || `Curriculum for ${topic}`,
      subject: data.subject || subject || 'General Study',
      level: data.level || level,
      estimatedMinutes: data.estimatedMinutes || 16,
      modules: data.modules || [],
      lectureNotes: data.lectureNotes || [],
      sourceMaterials: data.sourceMaterials || [],
      suggestedQuestions: data.suggestedQuestions || [],
      created_at: data.created_at,
    };

    return plan;
  } catch (error) {
    console.warn('[CurriculumService] Network or parsing error. Using intelligent fallback:', error);
    return createFallbackPlan(topic, level);
  }
}

/**
 * Fetches all saved curriculum plans and sessions for the user library.
 */
export async function fetchLibraryCurricula(): Promise<LessonPlan[]> {
  try {
    const response = await fetch(getApiUrl('/api/curriculum/library'), {
      method: 'GET',
      headers: {
        ...getAuthHeaders(),
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      console.warn(`[CurriculumService] Library endpoint returned ${response.status}`);
      return [];
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.warn('[CurriculumService] Error fetching library:', error);
    return [];
  }
}

