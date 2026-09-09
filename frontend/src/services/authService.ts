/**
 * Rabbly Authentication Service
 * Manages user authentication, token storage, and session authorization headers.
 */

export interface AuthUser {
  id: string;
  email: string;
  fullName?: string;
  avatarUrl?: string;
  role?: string;
  preferredLevel?: string;
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
  access_token: string;
  refresh_token?: string;
  token_type: string;
  expires_in?: number;
}

const AUTH_TOKEN_KEY = 'rabbly_auth_token';
const AUTH_USER_KEY = 'rabbly_auth_user';

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
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setCurrentUser(user: AuthUser): void {
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
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
  const res = await fetch('/api/auth/signin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Sign in failed. Please check your credentials.');
  }

  const data: AuthResponse = await res.json();
  if (data.access_token) {
    setAuthToken(data.access_token);
    setCurrentUser(data.user);
  }
  return data;
}

export async function signup(payload: SignUpPayload): Promise<AuthResponse> {
  const res = await fetch('/api/auth/signup', {
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
  if (data.access_token) {
    setAuthToken(data.access_token);
    setCurrentUser(data.user);
  }
  return data;
}

export async function requestPasswordReset(email: string): Promise<string> {
  const res = await fetch('/api/auth/forgot-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to send password reset request.');
  }

  const data = await res.json().catch(() => ({}));
  return data.message || 'Password reset link sent.';
}

export async function resetPassword(newPassword: string): Promise<string> {
  const res = await fetch('/api/auth/reset-password', {
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
    const res = await fetch('/api/auth/me', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    if (res.ok) {
      const data = await res.json();
      if (data.user) {
        setCurrentUser(data.user);
        return data.user;
      }
    }
  } catch {
    // Network or offline fallback
  }
  return getCurrentUser();
}
