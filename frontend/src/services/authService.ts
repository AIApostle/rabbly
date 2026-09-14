/**
 * Rabbly Authentication Service
 * Manages user authentication, token storage, and session authorization headers.
 */

import { getApiUrl } from './apiConfig';

export interface AuthUser {
  id: string;
  email: string;
  fullName?: string;
  full_name?: string;
  avatarUrl?: string;
  avatar_url?: string;
  role?: string;
  preferredLevel?: string;
  preferred_level?: string;
  username?: string;
  bio?: string;
  studyField?: string;
  isPro?: boolean;
  aiVoice?: string;
}

export interface SignInPayload {
  email: string;
  password: string;
}

export interface SignUpPayload {
  email: string;
  password: string;
  fullName?: string;
}

export interface AuthResponse {
  user: AuthUser;
  access_token?: string | null;
  refresh_token?: string | null;
  token_type?: string;
  expires_in?: number;
  confirmation_sent?: boolean;
  message?: string;
}

const AUTH_TOKEN_KEY = 'rabbly_auth_token';
const AUTH_USER_KEY = 'rabbly_auth_user';

export function normalizeUser(raw: any): AuthUser {
  if (!raw) return { id: '', email: '' };
  const fullName =
    raw.full_name ||
    raw.fullName ||
    raw.user_metadata?.full_name ||
    raw.user_metadata?.name ||
    '';
  return {
    id: raw.id,
    email: raw.email || '',
    fullName,
    full_name: fullName,
    avatarUrl:
      raw.avatar_url ||
      raw.avatarUrl ||
      raw.user_metadata?.avatar_url ||
      raw.user_metadata?.picture,
    avatar_url:
      raw.avatar_url ||
      raw.avatarUrl ||
      raw.user_metadata?.avatar_url ||
      raw.user_metadata?.picture,
    role: raw.role || 'authenticated',
    preferredLevel:
      raw.preferred_level ||
      raw.preferredLevel ||
      raw.user_metadata?.preferred_level ||
      'Beginner',
    preferred_level:
      raw.preferred_level ||
      raw.preferredLevel ||
      raw.user_metadata?.preferred_level ||
      'Beginner',
    username: raw.username || raw.user_metadata?.username || (raw.email ? `@${raw.email.split('@')[0]}` : '@student'),
    bio: raw.bio || raw.user_metadata?.bio || 'Mastering STEM, deep derivations, and interactive concepts on Rabbly AI.',
    studyField: raw.studyField || raw.user_metadata?.studyField || 'Computer Science & AI',
    isPro: raw.isPro ?? raw.user_metadata?.isPro ?? false,
    aiVoice: raw.aiVoice || raw.user_metadata?.aiVoice || 'Aoede',
  };
}

export function getAuthToken(): string | null {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function setAuthToken(token: string): void {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
}

export function removeAuthToken(): void {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
}

export function getCurrentUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(AUTH_USER_KEY);
    return raw ? normalizeUser(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export function setCurrentUser(user: AuthUser): void {
  const normalized = normalizeUser(user);
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(normalized));
}

export function getAuthHeaders(): HeadersInit {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export async function login(payload: SignInPayload): Promise<AuthResponse> {
  const res = await fetch(getApiUrl('/api/auth/signin'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Sign in failed. Please check your credentials.');
  }

  const data: AuthResponse = await res.json();
  if (data.user) {
    data.user = normalizeUser(data.user);
  }
  if (data.access_token) {
    setAuthToken(data.access_token);
    setCurrentUser(data.user);
  }
  return data;
}

export async function signup(payload: SignUpPayload): Promise<AuthResponse> {
  const res = await fetch(getApiUrl('/api/auth/signup'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: payload.email,
      password: payload.password,
      full_name: payload.fullName,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Sign up failed. Please check your details.');
  }

  const data: AuthResponse = await res.json();
  if (data.user) {
    data.user = normalizeUser(data.user);
  }
  if (data.access_token) {
    setAuthToken(data.access_token);
    setCurrentUser(data.user);
  }
  return data;
}

export async function requestPasswordReset(email: string): Promise<string> {
  const redirectTo = `${window.location.origin}/login#type=recovery`;
  const res = await fetch(getApiUrl('/api/auth/forgot-password'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      redirect_to: redirectTo,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to send password reset request.');
  }

  const data = await res.json().catch(() => ({}));
  return data.message || 'Password reset link sent.';
}

export async function resetPassword(newPassword: string): Promise<string> {
  const res = await fetch(getApiUrl('/api/auth/reset-password'), {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ new_password: newPassword }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Password reset failed.');
  }

  const data = await res.json().catch(() => ({}));
  return data.message || 'Password updated successfully.';
}

export async function verifyActiveToken(): Promise<AuthUser | null> {
  const token = getAuthToken();
  if (!token) return null;

  try {
    const res = await fetch(getApiUrl('/api/auth/me'), {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    if (res.ok) {
      const data = await res.json();
      if (data.user) {
        const normalized = normalizeUser(data.user);
        setCurrentUser(normalized);
        return normalized;
      }
    }
    // Any non-200 response (401, 403, 500…) means the session is invalid.
    // Clear it so the user is sent to login instead of the stale cached profile.
    removeAuthToken();
    return null;
  } catch {
    removeAuthToken();
    return null;
  }
}

export async function updateUserProfileOnServer(updates: Partial<AuthUser>): Promise<AuthUser | null> {
  const token = getAuthToken();
  if (!token) return null;

  try {
    const payload: Record<string, any> = {};
    if (updates.aiVoice) {
      payload.ai_voice = updates.aiVoice;
    }
    if (updates.fullName || updates.full_name) {
      payload.full_name = updates.fullName || updates.full_name;
    }
    if (updates.avatarUrl || updates.avatar_url) {
      payload.avatar_url = updates.avatarUrl || updates.avatar_url;
    }
    if (updates.bio) {
      payload.bio = updates.bio;
    }
    if (updates.preferredLevel || updates.preferred_level) {
      payload.preferred_level = updates.preferredLevel || updates.preferred_level;
    }

    const res = await fetch(getApiUrl('/api/auth/profile'), {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const data = await res.json();
      const normalized = normalizeUser(data);
      setCurrentUser(normalized);
      return normalized;
    }
    return null;
  } catch (err) {
    console.error('Failed to update user profile on server:', err);
    return null;
  }
}
