import React, { createContext, useState, useEffect, useCallback } from 'react';
import {
  type AuthUser,
  type SignInPayload,
  type SignUpPayload,
  type AuthResponse,
  getAuthToken,
  getCurrentUser,
  setCurrentUser as persistCurrentUser,
  removeAuthToken,
  login as apiLogin,
  signup as apiSignup,
  verifyActiveToken,
} from '../services/authService';

export interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (payload: SignInPayload) => Promise<AuthResponse>;
  signup: (payload: SignUpPayload) => Promise<AuthResponse>;
  logout: () => void;
  refreshUser: () => Promise<AuthUser | null>;
  setSession: (token: string, user?: AuthUser | null) => void;
  updateProfile: (updates: Partial<AuthUser>) => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => getAuthToken());
  const [user, setUser] = useState<AuthUser | null>(() => getCurrentUser());
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshUser = useCallback(async (): Promise<AuthUser | null> => {
    try {
      const activeUser = await verifyActiveToken();
      if (activeUser) {
        setUser(activeUser);
        setToken(getAuthToken());
        return activeUser;
      } else {
        setUser(null);
        setToken(null);
        removeAuthToken();
        return null;
      }
    } catch {
      setUser(null);
      setToken(null);
      removeAuthToken();
      return null;
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      const savedToken = getAuthToken();
      if (!savedToken) {
        if (isMounted) {
          setUser(null);
          setToken(null);
          setIsLoading(false);
        }
        return;
      }

      try {
        const activeUser = await verifyActiveToken();
        if (isMounted) {
          if (activeUser) {
            setUser(activeUser);
            setToken(savedToken);
          } else {
            setUser(null);
            setToken(null);
            removeAuthToken();
          }
        }
      } catch {
        if (isMounted) {
          setUser(null);
          setToken(null);
          removeAuthToken();
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    initAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = async (payload: SignInPayload): Promise<AuthResponse> => {
    const res = await apiLogin(payload);
    if (res.access_token) {
      setToken(res.access_token);
      setUser(res.user);
      persistCurrentUser(res.user);
    }
    return res;
  };

  const signup = async (payload: SignUpPayload): Promise<AuthResponse> => {
    const res = await apiSignup(payload);
    if (res.access_token) {
      setToken(res.access_token);
      setUser(res.user);
      persistCurrentUser(res.user);
    }
    return res;
  };

  const setSession = (newToken: string, newUser?: AuthUser | null) => {
    setToken(newToken);
    if (newUser) {
      setUser(newUser);
      persistCurrentUser(newUser);
    }
  };

  const logout = () => {
    removeAuthToken();
    setToken(null);
    setUser(null);
  };

  const updateProfile = (updates: Partial<AuthUser>) => {
    setUser((prev) => {
      if (!prev) return null;
      const updated = { ...prev, ...updates };
      persistCurrentUser(updated);
      return updated;
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        login,
        signup,
        logout,
        refreshUser,
        setSession,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export { useAuth } from './useAuth';
