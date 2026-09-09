/**
 * Rabbly Learning Session Service
 * Synchronizes recent learning sessions with the FastAPI backend (/api/sessions)
 * and maintains resilient local storage persistence for offline/instant-load capability.
 */

import type { RecentSessionData } from '../types';

const STORAGE_KEY = 'rabbly_recent_sessions_v1';

export interface BackendSessionPayload {
  id?: string;
  room_code?: string;
  topic: string;
  subject?: string;
  level: string;
  is_classroom?: boolean;
  status?: string;
  last_checkpoint?: string;
  completed_modules?: number;
  total_modules?: number;
  progress_percent?: number;
  has_external_resources?: boolean;
  resource_name?: string | null;
  board_state?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

const DEFAULT_SEEDS: RecentSessionData[] = [
  {
    id: 'sess-1',
    roomCode: 'RAB-1011',
    topic: 'Transformers & Self-Attention: The Engine of LLMs',
    subject: 'AI & LLMs',
    date: 'Today',
    timestamp: 'Today, 2:45 PM',
    lastCheckpoint: '2. The Query, Key, and Value (Q, K, V) Vector Mechanics',
    completedModules: 2,
    totalModules: 4,
    progressPercent: 50,
    level: 'Intermediate',
    hasExternalResources: true,
    resourceName: 'Attention_Is_All_You_Need.pdf',
  },
  {
    id: 'sess-2',
    roomCode: 'RAB-1012',
    topic: 'Distributed Rate Limiter Design with Redis',
    subject: 'System Architecture',
    date: 'Today',
    timestamp: 'Today, 11:20 AM',
    lastCheckpoint: '3. Atomic Redis Lua Script Execution',
    completedModules: 3,
    totalModules: 4,
    progressPercent: 75,
    level: 'Advanced',
    hasExternalResources: true,
    resourceName: 'system_design_primer.md',
  },
  {
    id: 'sess-3',
    roomCode: 'RAB-1013',
    topic: 'Quantum Superposition & Qubit Geometry',
    subject: 'Quantum Physics',
    date: 'Yesterday',
    timestamp: 'Yesterday, 4:10 PM',
    lastCheckpoint: '1. The Bloch Sphere & Linear Combinations',
    completedModules: 1,
    totalModules: 4,
    progressPercent: 25,
    level: 'Beginner',
    hasExternalResources: false,
  },
  {
    id: 'sess-4',
    roomCode: 'RAB-1014',
    topic: 'B-Tree Database Indexing & Page Splitting',
    subject: 'Database Systems',
    date: 'Earlier',
    timestamp: 'Sep 5, 2026',
    lastCheckpoint: '4. Summary & Range Query Performance',
    completedModules: 4,
    totalModules: 4,
    progressPercent: 100,
    level: 'Intermediate',
    hasExternalResources: false,
  },
];

/** Formats an ISO date string into human-friendly relative date tags */
export function formatSessionDate(isoString?: string): { dateTag: string; timeTag: string } {
  if (!isoString) {
    return { dateTag: 'Today', timeTag: 'Just now' };
  }

  const date = new Date(isoString);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  const timePart = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  if (diffDays === 0) {
    return { dateTag: 'Today', timeTag: `Today, ${timePart}` };
  } else if (diffDays === 1) {
    return { dateTag: 'Yesterday', timeTag: `Yesterday, ${timePart}` };
  } else {
    const formatted = date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    return { dateTag: formatted, timeTag: formatted };
  }
}

/** Maps backend session response format to frontend RecentSessionData */
export function mapBackendToSession(item: BackendSessionPayload): RecentSessionData {
  const { dateTag, timeTag } = formatSessionDate(item.updated_at || item.created_at);
  const level = (['Beginner', 'Intermediate', 'Advanced'].includes(item.level)
    ? item.level
    : 'Intermediate') as 'Beginner' | 'Intermediate' | 'Advanced';

  return {
    id: item.id || `sess-${item.room_code || Date.now()}`,
    roomCode: item.room_code,
    topic: item.topic,
    subject: item.subject || 'General Study',
    date: dateTag,
    timestamp: timeTag,
    lastCheckpoint: item.last_checkpoint || '1. Foundation & Intuition',
    completedModules: item.completed_modules ?? 0,
    totalModules: item.total_modules ?? 4,
    progressPercent: item.progress_percent ?? 0,
    level,
    hasExternalResources: item.has_external_resources ?? false,
    resourceName: item.resource_name || undefined,
    boardState: item.board_state,
    isClassroom: item.is_classroom,
  };
}

/** Retrieves cached sessions from localStorage */
export function getLocalSessions(): RecentSessionData[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Failed reading sessions from localStorage', err);
  }
  return DEFAULT_SEEDS;
}

/** Saves sessions list into localStorage */
export function saveLocalSessions(sessions: RecentSessionData[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  } catch (err) {
    console.warn('Failed saving sessions to localStorage', err);
  }
}

/**
 * Loads sessions from the backend API, syncing with local cache.
 */
export async function loadRecentSessions(): Promise<RecentSessionData[]> {
  try {
    const res = await fetch('/api/sessions', {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (res.ok) {
      const data: BackendSessionPayload[] = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const mapped = data.map(mapBackendToSession);
        saveLocalSessions(mapped);
        return mapped;
      }
    }
  } catch {
    // Backend may not be running yet; gracefully fall back to local store
  }

  return getLocalSessions();
}

/**
 * Records or updates a session both on backend and local store.
 */
export async function persistNewSession(session: Partial<RecentSessionData>): Promise<RecentSessionData> {
  const currentSessions = getLocalSessions();
  const roomCode = session.roomCode || `RAB-${Math.floor(1000 + Math.random() * 9000)}`;
  const now = new Date();

  const localItem: RecentSessionData = {
    id: session.id || `sess-${Date.now()}`,
    roomCode,
    topic: session.topic || 'Untitled Study',
    subject: session.subject || 'General Study',
    date: 'Today',
    timestamp: `Today, ${now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`,
    lastCheckpoint: session.lastCheckpoint || '1. Foundation & Intuition',
    completedModules: session.completedModules ?? 0,
    totalModules: session.totalModules ?? 4,
    progressPercent: session.progressPercent ?? 0,
    level: session.level || 'Intermediate',
    hasExternalResources: session.hasExternalResources ?? false,
    resourceName: session.resourceName,
    boardState: session.boardState,
    isClassroom: session.isClassroom ?? false,
  };

  // Immediate local cache update
  const updatedList = [localItem, ...currentSessions.filter((s) => s.roomCode !== roomCode && s.topic !== localItem.topic)];
  saveLocalSessions(updatedList);

  // Background sync to backend API
  try {
    const payload: BackendSessionPayload = {
      room_code: roomCode,
      topic: localItem.topic,
      subject: localItem.subject,
      level: localItem.level,
      is_classroom: localItem.isClassroom,
      last_checkpoint: localItem.lastCheckpoint,
      completed_modules: localItem.completedModules,
      total_modules: localItem.totalModules,
      progress_percent: localItem.progressPercent,
      has_external_resources: localItem.hasExternalResources,
      resource_name: localItem.resourceName,
      board_state: localItem.boardState,
    };

    const res = await fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const created: BackendSessionPayload = await res.json();
      return mapBackendToSession(created);
    }
  } catch (err) {
    console.debug('Backend session sync queued locally', err);
  }

  return localItem;
}

/**
 * Removes a session by ID or Room Code
 */
export async function removeSession(sessionId: string, roomCode?: string): Promise<void> {
  const currentSessions = getLocalSessions();
  const filtered = currentSessions.filter((s) => s.id !== sessionId && s.roomCode !== roomCode);
  saveLocalSessions(filtered);

  const codeToDelete = roomCode || currentSessions.find((s) => s.id === sessionId)?.roomCode;
  if (codeToDelete) {
    try {
      await fetch(`/api/sessions/${codeToDelete}`, {
        method: 'DELETE',
      });
    } catch {
      // Offline fallback
    }
  }
}
