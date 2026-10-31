import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, setCsrfToken } from '../../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState('loading');

  const applySession = useCallback((session) => {
    setUser(session || null);
    setCsrfToken(session?.csrf_token || '');
    setStatus(session ? 'authenticated' : 'guest');
  }, []);

  const refresh = useCallback(async () => {
    try {
      const session = await api.me();
      applySession(session);
      return session;
    } catch {
      applySession(null);
      return null;
    }
  }, [applySession]);

  useEffect(() => {
    refresh();
    const onUnauthorized = () => applySession(null);
    window.addEventListener('skilltrack:unauthorized', onUnauthorized);
    return () => window.removeEventListener('skilltrack:unauthorized', onUnauthorized);
  }, [refresh, applySession]);

  const login = useCallback(
    async (identity, password) => {
      const session = await api.login(identity, password);
      applySession(session);
      return session;
    },
    [applySession],
  );

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } catch {
      // Session may already be gone; clear the client anyway.
    } finally {
      applySession(null);
    }
  }, [applySession]);

  const value = useMemo(
    () => ({
      user,
      status,
      isAuthenticated: Boolean(user),
      isAdmin: user?.role === 'administrator',
      isInstructor: user?.role === 'instructor',
      isStudent: user?.role === 'student',
      isMonitoring: user?.role === 'monitoring_officer',
      can: (capability) => Boolean(user?.capabilities?.[capability]),
      login,
      logout,
      refresh,
    }),
    [user, status, login, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
