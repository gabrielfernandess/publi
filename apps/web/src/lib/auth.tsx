'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { api } from './api';

export type User = {
  id: number;
  email: string;
  nome: string;
  papel: 'admin' | 'user';
};

export function isAdmin(user: User | null | undefined): boolean {
  return user?.papel === 'admin';
}

type AuthCtx = {
  user: User | null;
  loading: boolean;
  login: (email: string, senha: string) => Promise<User>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const r = await api.get<{ user: User }>('/api/auth/me');
      setUser(r.user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const login = useCallback(async (email: string, senha: string) => {
    const r = await api.post<{ user: User }>('/api/auth/login', { email, senha });
    setUser(r.user);
    return r.user;
  }, []);

  const logout = useCallback(async () => {
    try { await api.post('/api/auth/logout', {}); } catch { /* noop */ }
    setUser(null);
  }, []);

  return <Ctx.Provider value={{ user, loading, login, logout, refresh }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth deve ser usado dentro de <AuthProvider>');
  return v;
}

/** Hook utilitario: true se o usuario logado for admin. */
export function useIsAdmin(): boolean {
  const { user } = useAuth();
  return isAdmin(user);
}
