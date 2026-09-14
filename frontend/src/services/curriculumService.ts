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
 * Intelligently infers academic subject category from topic keywords.
 */
export function inferSubjectFromTopic(topic: string): string {
  const t = (topic || '').toLowerCase();
  if (t.includes('math') || t.includes('calculus') || t.includes('algebra') || t.includes('geometry') || t.includes('vector') || t.includes('equation') || t.includes('differential') || t.includes('matrix')) return 'Mathematics';
  if (t.includes('physic') || t.includes('quantum') || t.includes('mechanic') || t.includes('gravity') || t.includes('energy') || t.includes('wave') || t.includes('thermodynamic')) return 'Physics';
  if (t.includes('code') || t.includes('program') || t.includes('python') || t.includes('react') || t.includes('algorithm') || t.includes('data structure') || t.includes('software') || t.includes('computer') || t.includes('ai') || t.includes('neural') || t.includes('database')) return 'Computer Science';
  if (t.includes('bio') || t.includes('cell') || t.includes('gene') || t.includes('dna') || t.includes('organism') || t.includes('evolution')) return 'Biology';
  if (t.includes('chem') || t.includes('atom') || t.includes('molecule') || t.includes('reaction') || t.includes('organic')) return 'Chemistry';
  if (t.includes('history') || t.includes('war') || t.includes('empire') || t.includes('civilization')) return 'History';
  if (t.includes('philosophy') || t.includes('ethics') || t.includes('logic')) return 'Philosophy';
  return 'STEM';
}

/**
 * Generates an adaptive fallback curriculum plan when the backend is offline or unreachable.
 */
function createFallbackPlan(topic: string, level: string): LessonPlan {
  const cleanTopic = topic.trim() || 'Interactive Lesson';
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
      description: `Dissecting invariant models, formal constraints, and component dynamics of ${cleanTopic}.`,
      keyTakeaways: [
        'Component relationships and formal invariant constraints.',
        'Practical mechanics and standard conventions.',
      ],
    },
    {
      id: 'm3',
      title: '3. Hands-On Worked Verification',
      duration: '5 min',
      status: 'upcoming',
      description: `Step-by-step trace and rigorous validation on the digital blackboard for ${cleanTopic}.`,
      keyTakeaways: [
        'Step-by-step verification methodology.',
        'Common pitfalls and failure mode mitigation.',
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
    subject: inferSubjectFromTopic(cleanTopic),
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
    suggestedQuestions: getTopicSpecificQuestions(cleanTopic, inferSubjectFromTopic(cleanTopic)),
  };
}

/**
 * Returns dynamic, authentic STEM questions tailored to the active topic and subject.
 */
export function getTopicSpecificQuestions(topic: string, subject?: string): string[] {
  const raw = (topic || '').trim();
  const clean = raw || 'Lesson Concept';
  const lowerTopic = clean.toLowerCase();
  const lowerSubj = (subject || '').toLowerCase();

  const isMath = /math|calculus|trig|algebra|geometry|fraction|matrix|vector|derivative|integral|quadratic|equation|statistics|probability/.test(lowerTopic) || /math/.test(lowerSubj);
  const isPhys = /physic|force|motion|energy|wave|circuit|electric|magnet|thermo|optics|gravity|momentum|velocity|acceleration/.test(lowerTopic) || /physic/.test(lowerSubj);
  const isChem = /chem|organic|reaction|acid|base|mole|bond|periodic|equilibrium|stoichiometry|titration|gas law/.test(lowerTopic) || /chem/.test(lowerSubj);
  const isBio = /bio|cell|genetics|ecology|respiration|photosynthesis|organ|blood|dna/.test(lowerTopic) || /bio/.test(lowerSubj);
  const isCS = /software|code|algorithm|data structure|system design|database|concurrency|network/.test(lowerTopic) || /computer/.test(lowerSubj);

  if (isMath) {
    return [
      `Can you walk through a step-by-step worked example of ${clean} on the board?`,
      `Why does the formula for ${clean} hold from first principles rather than pure memorization?`,
      `What is the most common calculation trap students fall into with ${clean} in WAEC / JAMB?`,
      `Can we solve a challenging problem on ${clean} together directly on the blackboard?`,
    ];
  }
  if (isPhys) {
    return [
      `Can you draw the diagram for ${clean} on the board and derive the equations step by step?`,
      `How do SI units and dimensional analysis confirm our calculations for ${clean}?`,
      `How does ${clean} apply to practical engineering and WAEC/JAMB exam problems?`,
      `What is the physical intuition behind ${clean} that helps solve problems without guessing?`,
    ];
  }
  if (isChem) {
    return [
      `Can you illustrate the reaction mechanism and molecular structures for ${clean} on the board?`,
      `How do temperature, pressure, or concentration affect ${clean} according to Le Chatelier's principle?`,
      `What observations, color changes, or reagents are tested in WAEC practicals for ${clean}?`,
      `Can you walk through the stoichiometric calculations for ${clean} step by step?`,
    ];
  }
  if (isBio) {
    return [
      `Can you draw and label the biological diagram and pathways for ${clean} on the canvas?`,
      `How do the cellular/physiological mechanisms in ${clean} work as an integrated system?`,
      `What key definitions and functional differences do WAEC/JAMB examiners test on ${clean}?`,
    ];
  }
  if (isCS) {
    return [
      `Can you trace an example execution of ${clean} step by step on the blackboard?`,
      `What are the time and space complexity guarantees when implementing ${clean}?`,
      `How does ${clean} handle edge cases, boundary conditions, and scale?`,
    ];
  }
  return [
    `Can you walk through a step-by-step worked example of ${clean} on the board?`,
    `What is the foundational first-principles intuition behind ${clean}?`,
    `What is the most common misconception students have about ${clean}?`,
    `How is ${clean} typically tested in WAEC, NECO, or university exams?`,
  ];
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
      subject: data.subject && data.subject.toLowerCase() !== 'general study' ? data.subject : (subject || inferSubjectFromTopic(topic)),
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

