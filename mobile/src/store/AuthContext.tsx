import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  ensureDeviceRegistered,
  fetchSession,
  logoutRequest,
  pinAuth,
  type PinAuthResult,
} from '../api/khuree';
import { hydrateCookieJar, onSessionExpired, resetSessionCookies } from '../services/api';
import type { LocalUser } from '../types/content';

type AuthContextValue = {
  user: LocalUser | null;
  loading: boolean;
  refresh: () => Promise<LocalUser | null>;
  login: (input: { kind: 'phone' | 'email'; identifier: string; pin: string }) => Promise<void>;
  register: (input: { kind: 'phone' | 'email'; identifier: string; pin: string; name: string }) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function userFromPinInput(input: { kind: 'phone' | 'email'; identifier: string; name?: string }): LocalUser {
  return {
    id: input.identifier,
    name: input.name?.trim() || input.identifier,
    email: input.kind === 'email' ? input.identifier : '',
    phone: input.kind === 'phone' ? input.identifier : '',
    loginKind: input.kind,
    credentialKind: 'pin',
    role: 'user',
    emailVerified: true,
    adultEnabled: false,
    hasParentalPin: false,
    adultUnlocked: false,
    canWatch: false,
    watchPermissions: { movie: false, series: false, vertical: false, adult: false },
    devices: [],
    deviceLimit: 3,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<LocalUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const next = await fetchSession();
    setUser(next);
    if (next) await ensureDeviceRegistered().catch(() => undefined);
    return next;
  }, []);

  const completeAuth = useCallback(async (
    result: PinAuthResult,
    input: { kind: 'phone' | 'email'; identifier: string; name?: string },
  ) => {
    const next = result.user ?? userFromPinInput(input);
    setUser(next);
    if (result.accessToken) await ensureDeviceRegistered().catch(() => undefined);
  }, []);

  useEffect(() => {
    onSessionExpired(() => {
      setUser(null);
      void resetSessionCookies();
    });
    void (async () => {
      await hydrateCookieJar();
      try {
        await refresh();
      } finally {
        setLoading(false);
      }
    })();
  }, [refresh]);

  const login = useCallback(async (input: { kind: 'phone' | 'email'; identifier: string; pin: string }) => {
    const result = await pinAuth('login', input);
    if (!result.ok) throw new Error('Нэвтрэх хүсэлт амжилтгүй боллоо.');
    await completeAuth(result, input);
  }, [completeAuth]);

  const register = useCallback(async (input: { kind: 'phone' | 'email'; identifier: string; pin: string; name: string }) => {
    const result = await pinAuth('signup', input);
    if (!result.ok) throw new Error('Бүртгэл үүсгэж чадсангүй.');
    await completeAuth(result, input);
  }, [completeAuth]);

  const logout = useCallback(async () => {
    await logoutRequest().catch(() => undefined);
    await resetSessionCookies();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, refresh, login, register, logout }),
    [user, loading, refresh, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used within AuthProvider');
  return value;
}
