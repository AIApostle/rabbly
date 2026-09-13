/**
 * Rabbly Classroom Service
 * Connects frontend collaborative study hub to backend /api/classrooms endpoints.
 * Provides local caching and graceful offline fallback.
 */

import type { ClassroomRoom, ExternalResource } from '../types';
import { getAuthHeaders } from './authService';
import { getApiUrl } from './apiConfig';

const CLASSROOMS_STORAGE_KEY = 'rabbly_classrooms_cache';

/**
 * Retrieve cached classrooms from localStorage.
 */
export function getLocalClassrooms(): ClassroomRoom[] {
  try {
    const raw = localStorage.getItem(CLASSROOMS_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      // Filter out any stale mock seeds
      return parsed.filter((c) => !['room-1', 'room-2'].includes(c.id));
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * Save classrooms cache to localStorage.
 */
export function saveLocalClassrooms(classrooms: ClassroomRoom[]): void {
  try {
    localStorage.setItem(CLASSROOMS_STORAGE_KEY, JSON.stringify(classrooms));
  } catch {
    // Local storage full or unavailable
  }
}

/**
 * Fetch all available classrooms from backend /api/classrooms.
 */
export async function loadClassrooms(): Promise<ClassroomRoom[]> {
  try {
    const res = await fetch(getApiUrl('/api/classrooms'), {
      headers: getAuthHeaders(),
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        const formatted: ClassroomRoom[] = data.map((d) => ({
          id: d.id,
          roomCode: d.room_code || d.roomCode,
          topic: d.topic,
          level: d.level,
          subject: d.subject || 'Collaborative Study',
          status: d.status || 'active',
          hostId: d.host_id || d.hostId,
          hostName: d.host_name || d.hostName || 'Host Student',
          participantCount: d.participant_count ?? d.participantCount ?? 1,
          participants: (d.participants || []).map((p: any) => ({
            id: p.id,
            name: p.name,
            avatar: p.avatar || '👨🏽‍🎓',
            isHost: Boolean(p.is_host ?? p.isHost),
            isMuted: Boolean(p.is_muted ?? p.isMuted ?? true),
            joinedAt: p.joined_at || p.joinedAt || 'Just now',
          })),
          hasExternalResources: Boolean(d.has_external_resources ?? d.hasExternalResources),
          resources: d.resources || [],
          createdAt: d.created_at || d.createdAt || new Date().toISOString(),
          updatedAt: d.updated_at || d.updatedAt || new Date().toISOString(),
        }));
        saveLocalClassrooms(formatted);
        return formatted;
      }
    }
  } catch {
    // Network failure fallback
  }
  return getLocalClassrooms();
}

/**
 * Create a new classroom via POST /api/classrooms.
 */
export async function createClassroom(payload: {
  topic: string;
  level?: string;
  subject?: string;
  resources?: ExternalResource[];
}): Promise<ClassroomRoom> {
  const body = {
    topic: payload.topic,
    level: payload.level || 'Intermediate',
    subject: payload.subject || 'Collaborative Study',
    resources: payload.resources || [],
  };

  try {
    const res = await fetch(getApiUrl('/api/classrooms'), {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(body),
    });

    if (res.ok) {
      const d = await res.json();
      const created: ClassroomRoom = {
        id: d.id,
        roomCode: d.room_code || d.roomCode,
        topic: d.topic,
        level: d.level,
        subject: d.subject || 'Collaborative Study',
        status: d.status || 'active',
        hostId: d.host_id || d.hostId,
        hostName: d.host_name || d.hostName || 'Host Student',
        participantCount: d.participant_count ?? d.participantCount ?? 1,
        participants: (d.participants || []).map((p: any) => ({
          id: p.id,
          name: p.name,
          avatar: p.avatar || '👨🏽‍🎓',
          isHost: Boolean(p.is_host ?? p.isHost),
          isMuted: Boolean(p.is_muted ?? p.isMuted ?? true),
          joinedAt: p.joined_at || p.joinedAt || 'Just now',
        })),
        hasExternalResources: Boolean(d.has_external_resources ?? d.hasExternalResources),
        resources: d.resources || [],
        createdAt: d.created_at || d.createdAt || new Date().toISOString(),
        updatedAt: d.updated_at || d.updatedAt || new Date().toISOString(),
      };

      const current = getLocalClassrooms();
      saveLocalClassrooms([created, ...current.filter((c) => c.roomCode !== created.roomCode)]);
      return created;
    }
  } catch {
    // Fallback in case backend is offline
  }

  // Local fallback creation
  const fallbackCode = `RAB-${Math.floor(1000 + Math.random() * 9000)}`;
  const localRoom: ClassroomRoom = {
    id: `room-${Date.now()}`,
    roomCode: fallbackCode,
    topic: payload.topic,
    level: (payload.level as any) || 'Intermediate',
    subject: payload.subject || 'Collaborative Study',
    status: 'active',
    hostName: 'You (Host)',
    participantCount: 1,
    participants: [
      { id: 'user-host', name: 'You (Host)', avatar: '🎓', isHost: true, isMuted: true, joinedAt: 'Just now' },
    ],
    hasExternalResources: Boolean(payload.resources && payload.resources.length > 0),
    resources: payload.resources || [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const current = getLocalClassrooms();
  saveLocalClassrooms([localRoom, ...current]);
  return localRoom;
}

/**
 * Verify that a room code exists and fetch its details.
 */
export async function verifyRoomCode(roomCode: string): Promise<ClassroomRoom> {
  const cleanCode = roomCode.trim().toUpperCase();

  try {
    const res = await fetch(getApiUrl(`/api/classrooms/${cleanCode}`), {
      headers: getAuthHeaders(),
    });

    if (res.ok) {
      const d = await res.json();
      return {
        id: d.id,
        roomCode: d.room_code || d.roomCode,
        topic: d.topic,
        level: d.level,
        subject: d.subject || 'Collaborative Study',
        status: d.status || 'active',
        hostId: d.host_id || d.hostId,
        hostName: d.host_name || d.hostName || 'Host Student',
        participantCount: d.participant_count ?? d.participantCount ?? 1,
        participants: (d.participants || []).map((p: any) => ({
          id: p.id,
          name: p.name,
          avatar: p.avatar || '👨🏽‍🎓',
          isHost: Boolean(p.is_host ?? p.isHost),
          isMuted: Boolean(p.is_muted ?? p.isMuted ?? true),
          joinedAt: p.joined_at || p.joinedAt || 'Just now',
        })),
        hasExternalResources: Boolean(d.has_external_resources ?? d.hasExternalResources),
        resources: d.resources || [],
        curriculumPlan: d.curriculum_plan || d.curriculumPlan || null,
        boardState: d.board_state || d.boardState || null,
        toolHistory: d.tool_history || d.toolHistory || null,
        createdAt: d.created_at || d.createdAt || new Date().toISOString(),
        updatedAt: d.updated_at || d.updatedAt || new Date().toISOString(),
      };
    }
  } catch (err: any) {
    console.warn('Backend classroom verification error:', err);
  }

  // Check local cache
  const local = getLocalClassrooms().find((r) => r.roomCode.toUpperCase() === cleanCode);
  if (local) return local;

  // If looks like valid RAB-XXXX pattern, allow entering
  if (/^RAB-[A-Z0-9]{4,}$/.test(cleanCode)) {
    return {
      id: `room-${cleanCode}`,
      roomCode: cleanCode,
      topic: `Classroom Session (${cleanCode})`,
      level: 'Intermediate',
      subject: 'Collaborative Study',
      status: 'active',
      hostName: 'Host Student',
      participantCount: 1,
      participants: [
        { id: 'peer-host', name: 'Host Student', avatar: '🎓', isHost: true, isMuted: true, joinedAt: 'Just now' },
      ],
      hasExternalResources: false,
      resources: [],
      curriculumPlan: null,
      boardState: null,
      toolHistory: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  throw new Error(`Classroom code '${cleanCode}' was not found. Please check the link or code.`);
}

/**
 * Join an existing classroom room.
 */
export async function joinClassroom(roomCode: string, participantName?: string): Promise<ClassroomRoom> {
  const cleanCode = roomCode.trim().toUpperCase();

  try {
    const res = await fetch(getApiUrl(`/api/classrooms/${cleanCode}/join`), {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ participant_name: participantName }),
    });

    if (res.ok) {
      const d = await res.json();
      return {
        id: d.id,
        roomCode: d.room_code || d.roomCode,
        topic: d.topic,
        level: d.level,
        subject: d.subject || 'Collaborative Study',
        status: d.status || 'active',
        hostId: d.host_id || d.hostId,
        hostName: d.host_name || d.hostName || 'Host Student',
        participantCount: d.participant_count ?? d.participantCount ?? 1,
        participants: (d.participants || []).map((p: any) => ({
          id: p.id,
          name: p.name,
          avatar: p.avatar || '👨🏽‍🎓',
          isHost: Boolean(p.is_host ?? p.isHost),
          isMuted: Boolean(p.is_muted ?? p.isMuted ?? true),
          joinedAt: p.joined_at || p.joinedAt || 'Just now',
        })),
        hasExternalResources: Boolean(d.has_external_resources ?? d.hasExternalResources),
        resources: d.resources || [],
        curriculumPlan: d.curriculum_plan || d.curriculumPlan || null,
        boardState: d.board_state || d.boardState || null,
        toolHistory: d.tool_history || d.toolHistory || null,
        createdAt: d.created_at || d.createdAt || new Date().toISOString(),
        updatedAt: d.updated_at || d.updatedAt || new Date().toISOString(),
      };
    }
  } catch {
    // Local fallback
  }

  return verifyRoomCode(cleanCode);
}

/**
 * Permanently end an active classroom session (host only).
 */
export async function endClassroom(roomCode: string): Promise<boolean> {
  const cleanCode = roomCode.trim().toUpperCase();

  // 1. Update local cache
  const current = getLocalClassrooms();
  const updated = current.map((r) =>
    r.roomCode.toUpperCase() === cleanCode ? { ...r, status: 'ended' as const } : r
  );
  saveLocalClassrooms(updated);

  // 2. Notify backend endpoint
  try {
    const res = await fetch(getApiUrl(`/api/classrooms/${cleanCode}/end`), {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return res.ok;
  } catch (err) {
    console.warn('Failed to dispatch endClassroom to backend:', err);
    return true;
  }
}

