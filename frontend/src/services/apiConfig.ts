/**
 * Rabbly Backend API & WebSocket Configuration
 * 
 * Provides unified endpoint resolution connecting to the Render backend service:
 * - Production / Default: https://rabbly.onrender.com (and wss://rabbly.onrender.com)
 * - Local development: http://localhost:8000 (and ws://localhost:8000) when VITE_USE_LOCAL_BACKEND is 'true'
 * - Custom overrides via VITE_API_URL and VITE_WS_URL
 */

export const RENDER_BACKEND_URL = 'https://rabbly.onrender.com';
export const RENDER_WS_URL = 'wss://rabbly.onrender.com';

/**
 * Returns the base HTTP API URL.
 */
export function getApiBaseUrl(): string {
  // 1. Explicit override in environment
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim()) {
    return envUrl.trim().replace(/\/+$/, '');
  }

  // 2. If developer explicitly toggled local backend
  if (
    import.meta.env.VITE_USE_LOCAL_BACKEND === 'true' &&
    typeof window !== 'undefined' &&
    window.location.hostname === 'localhost'
  ) {
    return 'http://localhost:8000';
  }

  // 3. Default to Render backend
  return RENDER_BACKEND_URL;
}

/**
 * Constructs a full API URL from a relative path (e.g. '/api/classrooms' -> 'https://rabbly.onrender.com/api/classrooms')
 */
export function getApiUrl(path: string): string {
  const base = getApiBaseUrl();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${cleanPath}`;
}

/**
 * Returns the base WebSocket URL for the LiveDualSessionService.
 */
export function getWebSocketBaseUrl(): string {
  // 1. Explicit WebSocket URL override
  const envWs = import.meta.env.VITE_WS_URL;
  if (envWs && typeof envWs === 'string' && envWs.trim()) {
    return envWs.trim().replace(/\/+$/, '');
  }

  // 2. If explicit API URL provided, convert http->ws / https->wss
  const apiUrl = import.meta.env.VITE_API_URL;
  if (apiUrl && typeof apiUrl === 'string' && apiUrl.trim()) {
    return apiUrl
      .trim()
      .replace(/\/+$/, '')
      .replace(/^http:\/\//, 'ws://')
      .replace(/^https:\/\//, 'wss://');
  }

  // 3. If developer explicitly toggled local backend
  if (
    import.meta.env.VITE_USE_LOCAL_BACKEND === 'true' &&
    typeof window !== 'undefined' &&
    window.location.hostname === 'localhost'
  ) {
    return 'ws://localhost:8000';
  }

  // 4. Default to Render WebSocket server
  return RENDER_WS_URL;
}
