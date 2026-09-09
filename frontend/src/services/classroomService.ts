/**
 * Rabbly Classroom Service
 * Connects frontend collaborative study hub to backend /api/classrooms endpoints.
 * Provides local caching and graceful offline fallback.
 */

import type { ClassroomRoom, ExternalResource } from '../types';
import { getAuthHeaders } from './authService';

const CLASSROOMS_STORAGE_KEY = 'rabbly_classrooms_cache';

const INITIAL_FALLBACK_CLASSROOMS: ClassroomRoom[] = [
  {
    id: 'room-1',
    roomCode: 'RAB-9412',
    topic: 'Distributed Token Bucket Rate Limiting with Redis & Lua',
    level: 'Advanced',
    subject: 'System Architecture',
    status: 'active',
    hostId: 'user-alex',
    hostName: 'Alex Rivera',
    participantCount: 3,
    participants: [
      { id: 'p-1', name: 'Alex Rivera (Host)', avatar: '🎓', isHost: true, isMuted: true, joinedAt: 'Just now' },
      { id: 'p-2', name: 'Maya Chen', avatar: '👩🏻‍💻', isHost: false, isMuted: true, joinedAt: '2m ago' },
      { id: 'p-3', name: 'Jordan Patel', avatar: '👨🏽‍🎓', isHost: false, isMuted: true, joinedAt: 'Just now' },
    ],
    hasExternalResources: true,
    resources: [
      { id: 'r-1', type: 'link', title: 'System Design Primer - Rate Limiter', detail: 'github.com' },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'room-2',
    roomCode: 'RAB-3820',
    topic: 'Quantum Superposition & Bell State Entanglement',
    level: 'Beginner',
    subject: 'Quantum Physics',
    status: 'active',
    hostId: 'user-elena',
    hostName: 'Elena Rostova',
    participantCount: 2,
    participants: [
      { id: 'p-4', name: 'Elena Rostova (Host)', avatar: '⚛️', isHost: true, isMuted: true, joinedAt: '5m ago' },
      { id: 'p-5', name: 'Marcus Vance', avatar: '👨🏼‍🔬', isHost: false, isMuted: true, joinedAt: '1m ago' },
    ],
    hasExternalResources: false,
    resources: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

/**
 * Retrieve cached classrooms from localStorage.
 */
export function getLocalClassrooms(): ClassroomRoom[] {
  try {
    const raw = localStorage.getItem(CLASSROOMS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(CLASSROOMS_STORAGE_KEY, JSON.stringify(INITIAL_FALLBACK_CLASSROOMS));
      return INITIAL_FALLBACK_CLASSROOMS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_FALLBACK_CLASSROOMS;
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
    const res = await fetch('/api/classrooms', {
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
    const res = await fetch('/api/classrooms', {
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
    const res = await fetch(`/api/classrooms/${cleanCode}`, {
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
        createdAt: d.created_at || d.createdAt || new Date().toISOString(),
        updatedAt: d.updated_at || d.updatedAt || new Date().toISOString(),
      };
    } else if (res.status === 404) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Classroom with code '${cleanCode}' was not found.`);
    }
  } catch (err: any) {
    if (err.message && err.message.includes('not found')) {
      throw err;
    }
  }

  // Check local cache
  const local = getLocalClassrooms().find((r) => r.roomCode.toUpperCase() === cleanCode);
  if (local) return local;

  // If looks like valid RAB-XXXX pattern, allow entering
  if (/^RAB-\d{4}$/.test(cleanCode)) {
    return {
      id: `room-${cleanCode}`,
      roomCode: cleanCode,
      topic: `Classroom Session ${cleanCode}`,
      level: 'Intermediate',
      subject: 'Collaborative Study',
      status: 'active',
      hostName: 'Study Peer',
      participantCount: 1,
      participants: [
        { id: 'peer-1', name: 'Study Peer', avatar: '👩🏻‍💻', isHost: true, isMuted: true, joinedAt: '5m ago' },
      ],
      hasExternalResources: false,
      resources: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  throw new Error(`Classroom with code '${cleanCode}' does not exist. Please check the code and try again.`);
}

/**
 * Join an existing classroom room.
 */
export async function joinClassroom(roomCode: string, participantName?: string): Promise<ClassroomRoom> {
  const cleanCode = roomCode.trim().toUpperCase();

  try {
    const res = await fetch(`/api/classrooms/${cleanCode}/join`, {
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
        createdAt: d.created_at || d.createdAt || new Date().toISOString(),
        updatedAt: d.updated_at || d.updatedAt || new Date().toISOString(),
      };
    }
  } catch {
    // Local fallback
  }

  return verifyRoomCode(cleanCode);
}
