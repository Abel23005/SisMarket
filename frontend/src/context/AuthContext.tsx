import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import api from '../lib/api';
import type { AuthResponse, AuthUser } from '../types/auth';

interface RegisterInput {
  username: string;
  email: string;
  fullName: string;
  password: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const TOKEN_KEY = 'sismarket_token';
const USER_KEY = 'sismarket_user';

function initializeToken(): string | null {
  // Discard sessions created by older versions that survived browser restarts.
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  const token = sessionStorage.getItem(TOKEN_KEY);
  if (!token) return null;
  try {
    const encodedPayload = token.split('.')[1]?.replace(/-/g, '+').replace(/_/g, '/');
    if (!encodedPayload) throw new Error('Token inválido');
    const payload = JSON.parse(atob(encodedPayload)) as { exp?: number };
    if (!payload.exp || payload.exp * 1000 <= Date.now()) throw new Error('Token vencido');
    return token;
  } catch {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
    return null;
  }
}

function loadStoredUser(): AuthUser | null {
  const raw = sessionStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(
    initializeToken,
  );
  const [user, setUser] = useState<AuthUser | null>(loadStoredUser);

  const saveSession = useCallback((data: AuthResponse) => {
    sessionStorage.setItem(TOKEN_KEY, data.accessToken);
    sessionStorage.setItem(USER_KEY, JSON.stringify(data.user));
    setToken(data.accessToken);
    setUser(data.user);
  }, []);

  const login = useCallback(
    async (username: string, password: string) => {
      const { data } = await api.post<AuthResponse>('/auth/login', {
        username: username.trim(),
        password,
      });
      saveSession(data);
    },
    [saveSession],
  );

  const register = useCallback(
    async (input: RegisterInput) => {
      const { data } = await api.post<AuthResponse>('/auth/register', {
        username: input.username.trim(),
        email: input.email.trim(),
        fullName: input.fullName.trim(),
        password: input.password,
      });
      saveSession(data);
    },
    [saveSession],
  );

  const logout = useCallback(() => {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(token && user),
      login,
      register,
      logout,
    }),
    [user, token, login, register, logout],
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return ctx;
}
