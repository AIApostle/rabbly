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
      if (Array.isArray(parsed)) {
        // Filter out any stale mock sprint seeds
        return parsed.filter((s) => !['sprint-1', 'sprint-2', 'sprint-3'].includes(s.id));
      }
    }
  } catch (err) {
    console.warn('Failed reading sprints from localStorage', err);
  }
  return [];
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
      if (Array.isArray(data)) {
        const mapped = data.map(mapBackendToSprint);
        saveLocalSprints(mapped);
        return mapped;
      }
    }
  } catch {
    // Backend offline fallback
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
