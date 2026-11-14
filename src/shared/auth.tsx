// ============================================================
// Auth Context — Async JWT authentication via MySQL backend
// ============================================================

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import type { AppUser } from './types';
import { authenticate, setToken, initStore, getUserById } from './store';
import { logger } from './logger';

interface AuthContextType {
  user: AppUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  refreshUser: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // On mount: check for stored session token
  useEffect(() => {
    const stored = sessionStorage.getItem('cabinet_session');
    if (stored) {
      const parsed = JSON.parse(stored) as { userId: string; token: string };
      setToken(parsed.token);
      initStore(parsed.token)
        .then(() => {
          const u = getUserById(parsed.userId);
          if (u) {
            setUser(u);
          } else {
            // Token invalid — clear session
            sessionStorage.removeItem('cabinet_session');
            setToken(null);
          }
        })
        .catch(() => {
          // Backend unreachable — clear session
          sessionStorage.removeItem('cabinet_session');
          setToken(null);
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const result = await authenticate(email, password);
      if (!result) {
        logger.warn('Login failed', { email });
        return { success: false, error: 'Email ou mot de passe incorrect.' };
      }
      setToken(result.token);
      await initStore(result.token);
      setUser(result.user);
      sessionStorage.setItem('cabinet_session', JSON.stringify({ userId: result.user.id, token: result.token }));
      logger.info('Login successful', { email, role: result.user.role });
      return { success: true };
    } catch (err) {
      logger.error('Login error', String(err));
      return { success: false, error: 'Erreur de connexion au serveur.' };
    }
  }, []);

  const logout = useCallback(() => {
    logger.info('Logout', { userId: user?.id });
    setUser(null);
    setToken(null);
    sessionStorage.removeItem('cabinet_session');
  }, [user]);

  const refreshUser = useCallback(() => {
    // User data is already in cache from initStore
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
