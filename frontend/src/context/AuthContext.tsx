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

function loadStoredUser(): AuthUser | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(
    () => localStorage.getItem(TOKEN_KEY),
  );
  const [user, setUser] = useState<AuthUser | null>(loadStoredUser);

  const saveSession = useCallback((data: AuthResponse) => {
    localStorage.setItem(TOKEN_KEY, data.accessToken);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
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
        role: 'cajero',
      });
      saveSession(data);
    },
    [saveSession],
  );

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
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
