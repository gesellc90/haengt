import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { authApi } from '../api/auth.js';
import { clearToken, getToken, setToken } from '../api/client.js';
import type { PublicMember } from '../types/api.js';

// ---------------------------------------------------------------------------
// Typen
// ---------------------------------------------------------------------------

interface AuthState {
  /** null = nicht eingeloggt, undefined = noch am Laden */
  member: PublicMember | null | undefined;
  isLoading: boolean;
}

interface AuthContextValue extends AuthState {
  login(username: string, password: string): Promise<void>;
  logout(): Promise<void>;
  /** Gibt true zurück, wenn der User eingeloggt und aktiv ist */
  isAuthenticated: boolean;
  isAdmin: boolean;
}

// ---------------------------------------------------------------------------
// Kontext
// ---------------------------------------------------------------------------

const AuthContext = createContext<AuthContextValue | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function AuthProvider({ children }: { children: ReactNode }) {
  const [member, setMember] = useState<PublicMember | null | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  // Verhindert doppelten /auth/me-Call in React-StrictMode
  const initDone = useRef(false);

  // Beim ersten Laden: wenn ein Token im localStorage liegt, /auth/me aufrufen
  useEffect(() => {
    if (initDone.current) return;
    initDone.current = true;

    const token = getToken();
    if (!token) {
      setMember(null);
      setIsLoading(false);
      return;
    }

    authApi
      .me()
      .then((m) => setMember(m))
      .catch(() => {
        clearToken();
        setMember(null);
      })
      .finally(() => setIsLoading(false));
  }, []);

  // Globales 401-Event: jemand (z. B. ein API-Call) hat ein abgelaufenes Token entdeckt
  useEffect(() => {
    const handler = () => {
      setMember(null);
    };
    window.addEventListener('auth:unauthorized', handler);
    return () => window.removeEventListener('auth:unauthorized', handler);
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const { token, member: m } = await authApi.login(username, password);
    setToken(token);
    setMember(m);
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      clearToken();
      setMember(null);
    }
  }, []);

  const value: AuthContextValue = {
    member,
    isLoading,
    isAuthenticated: member !== null && member !== undefined,
    isAdmin: member?.role === 'admin',
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth muss innerhalb von <AuthProvider> verwendet werden.');
  }
  return ctx;
}
