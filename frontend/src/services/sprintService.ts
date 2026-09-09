/**
 * Rabbly Learning Sprints Service
 * Connects the Sprints Page with the backend (/api/sprints)
 * and maintains local caching for instant-load and offline support.
 */

import type { ExternalResource } from '../types';
import { getAuthHeaders } from './authService';

export interface Milestone {
  id: string;
  title: string;
  status: 'completed' | 'in-progress' | 'upcoming';
}

export interface LearningSprint {
  id: string;
  user_id?: string | null;
  title: string;
  subject: string;
  timeframe: string;
  daysRemaining: number;
  totalDays: number;
  progressPercent: number;
  milestones: Milestone[];
  resources: ExternalResource[];
  createdAt: string;
}

interface BackendSprintPayload {
  id: string;
  user_id?: string | null;
  title: string;
  subject: string;
  timeframe: string;
  days_remaining: number;
  total_days: number;
  progress_percent: number;
  milestones: Milestone[];
  resources: ExternalResource[];
  created_at?: string;
  updated_at?: string;
}

const STORAGE_KEY = 'rabbly_learning_sprints_v1';

const DEFAULT_SPRINTS: LearningSprint[] = [
  {
    id: 'sprint-1',
    title: 'Master Multivariable Calculus & Vector Fields in 3 Days',
    subject: 'Mathematics & Calculus',
    timeframe: '3-Day Sprint',
    daysRemaining: 1,
    totalDays: 3,
    progressPercent: 66,
    milestones: [
      { id: 'm1', title: '1. Partial Derivatives & Gradient Direction Vectors', status: 'completed' },
      { id: 'm2', title: '2. Double & Triple Integrals over Bounded Regions', status: 'completed' },
      { id: 'm3', title: "3. Green's Theorem & Line Integrals in Vector Fields", status: 'in-progress' },
      { id: 'm4', title: "4. Divergence, Curl & Stokes' Theorem Final Review", status: 'upcoming' },
    ],
    resources: [
      { id: 'r1', type: 'file', title: 'Stewart_Calculus_Chapter14.pdf', detail: '2.4 MB' },
      { id: 'r2', type: 'youtube', title: '3Blue1Brown - Essence of Calculus', detail: 'YouTube Video' },
    ],
    createdAt: '2 days ago',
  },
  {
    id: 'sprint-2',
    title: 'Build a Production Transformer from Scratch in PyTorch',
    subject: 'Deep Learning & LLMs',
    timeframe: '5-Day Sprint',
    daysRemaining: 3,
    totalDays: 5,
    progressPercent: 40,
    milestones: [
      { id: 'm1', title: '1. Query, Key, Value Dot-Product Math & Softmax Scaling', status: 'completed' },
      { id: 'm2', title: '2. Multi-Head Projection & Residual Connection Layers', status: 'completed' },
      { id: 'm3', title: '3. Sinusoidal & Rotary Positional Embeddings (RoPE)', status: 'in-progress' },
      { id: 'm4', title: '4. Causal Attention Masking & Cross-Entropy Optimization', status: 'upcoming' },
      { id: 'm5', title: '5. Inference Generation, Top-K & Temperature Sampling', status: 'upcoming' },
    ],
    resources: [
      { id: 'r3', type: 'file', title: 'Attention_Is_All_You_Need.pdf', detail: '1.8 MB' },
      { id: 'r4', type: 'link', title: 'NanoGPT Architecture Reference', detail: 'github.com' },
    ],
    createdAt: '3 days ago',
  },
  {
    id: 'sprint-3',
    title: 'Distributed Systems & High-Throughput Rate Limiting',
    subject: 'System Design',
    timeframe: '1-Week Sprint',
    daysRemaining: 4,
    totalDays: 7,
    progressPercent: 50,
    milestones: [
      { id: 'm1', title: '1. Token Bucket vs Leaky Bucket vs Sliding Window', status: 'completed' },
      { id: 'm2', title: '2. Atomic Redis Execution with Lua Scripting', status: 'completed' },
      { id: 'm3', title: '3. Distributed Caching & Cluster Sharding Strategies', status: 'in-progress' },
      { id: 'm4', title: '4. Handling Hot-Key Cascades & Graceful Degradation', status: 'upcoming' },
    ],
    resources: [
      { id: 'r5', type: 'file', title: 'Designing_Data_Intensive_Applications.pdf', detail: '5.1 MB' },
      { id: 'r6', type: 'youtube', title: 'Distributed Systems Lecture Series', detail: 'YouTube Tutorial' },
    ],
    createdAt: '4 days ago',
  },
];

function mapBackendToSprint(b: BackendSprintPayload): LearningSprint {
  return {
    id: b.id,
    user_id: b.user_id,
    title: b.title,
    subject: b.subject,
    timeframe: b.timeframe,
    daysRemaining: b.days_remaining,
    totalDays: b.total_days,
    progressPercent: b.progress_percent,
    milestones: b.milestones || [],
    resources: b.resources || [],
    createdAt: b.created_at ? new Date(b.created_at).toLocaleDateString() : 'Recently',
  };
}

export function getLocalSprints(): LearningSprint[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (err) {
    console.warn('Failed reading sprints from localStorage', err);
  }
  return DEFAULT_SPRINTS;
}

export function saveLocalSprints(sprints: LearningSprint[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sprints));
  } catch (err) {
    console.warn('Failed saving sprints to localStorage', err);
  }
}

export async function loadSprints(): Promise<LearningSprint[]> {
  try {
    const res = await fetch('/api/sprints', {
      headers: getAuthHeaders(),
    });
    if (res.ok) {
      const data: BackendSprintPayload[] = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const mapped = data.map(mapBackendToSprint);
        saveLocalSprints(mapped);
        return mapped;
      }
    }
  } catch {
    // Offline fallback
  }
  return getLocalSprints();
}

export async function createSprint(sprint: Partial<LearningSprint>): Promise<LearningSprint> {
  const current = getLocalSprints();
  const id = sprint.id || `sprint-${Date.now()}`;
  const days = sprint.timeframe?.includes('3') ? 3 : sprint.timeframe?.includes('5') ? 5 : 7;

  const localItem: LearningSprint = {
    id,
    title: sprint.title || 'Untitled Sprint',
    subject: sprint.subject || 'General Mastery',
    timeframe: sprint.timeframe || '3-Day Sprint',
    daysRemaining: sprint.daysRemaining ?? days,
    totalDays: sprint.totalDays ?? days,
    progressPercent: sprint.progressPercent ?? 0,
    milestones: sprint.milestones || [],
    resources: sprint.resources || [],
    createdAt: 'Just now',
  };

  const updated = [localItem, ...current];
  saveLocalSprints(updated);

  try {
    const payload = {
      id: localItem.id,
      title: localItem.title,
      subject: localItem.subject,
      timeframe: localItem.timeframe,
      days_remaining: localItem.daysRemaining,
      total_days: localItem.totalDays,
      progress_percent: localItem.progressPercent,
      milestones: localItem.milestones,
      resources: localItem.resources,
    };

    const res = await fetch('/api/sprints', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const created: BackendSprintPayload = await res.json();
      return mapBackendToSprint(created);
    }
  } catch {
    // Queued locally
  }
  return localItem;
}

export async function updateSprintMilestones(
  sprintId: string,
  milestones: Milestone[],
  progressPercent: number
): Promise<void> {
  const current = getLocalSprints();
  const updated = current.map((s) => (s.id === sprintId ? { ...s, milestones, progressPercent } : s));
  saveLocalSprints(updated);

  try {
    await fetch(`/api/sprints/${sprintId}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        milestones,
        progress_percent: progressPercent,
      }),
    });
  } catch {
    // Offline fallback
  }
}

export async function deleteSprint(sprintId: string): Promise<void> {
  const current = getLocalSprints();
  const updated = current.filter((s) => s.id !== sprintId);
  saveLocalSprints(updated);

  try {
    await fetch(`/api/sprints/${sprintId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
  } catch {
    // Offline fallback
  }
}
