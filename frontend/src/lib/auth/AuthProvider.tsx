'use client';

import React, { createContext, useContext, useEffect, useCallback } from 'react';
import { useAuthStore, AuthTokens, UserProfile } from '@/stores/auth.store';

interface AuthContextValue {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: UserProfile | null;
  tokens: AuthTokens | null;
  login: (tokens: AuthTokens, user: UserProfile) => void;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const store = useAuthStore();

  const logout = useCallback(async () => {
    try {
      // Call backend logout endpoint to revoke session
      if (store.tokens?.accessToken) {
        await fetch('/api/v1/auth/logout', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${store.tokens.accessToken}`,
          },
        }).catch(() => {
          // Logout locally even if server call fails
        });
      }
    } finally {
      store.logout();
    }
  }, [store]);

  const refreshToken = useCallback(async () => {
    if (!store.tokens?.refreshToken) {
      store.logout();
      return;
    }

    try {
      const response = await fetch('/api/v1/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken: store.tokens.refreshToken }),
      });

      if (!response.ok) {
        store.logout();
        return;
      }

      const data = await response.json();
      store.setTokens({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken || store.tokens.refreshToken,
        idToken: data.idToken,
        expiresAt: Date.now() + (data.expiresIn || 3600) * 1000,
      });
    } catch {
      store.logout();
    }
  }, [store]);

  // Check token expiry on mount and set up refresh interval
  useEffect(() => {
    store.setLoading(false);

    if (!store.tokens) return;

    const checkExpiry = () => {
      if (store.tokens && store.tokens.expiresAt < Date.now() + 5 * 60 * 1000) {
        refreshToken();
      }
    };

    checkExpiry();
    const interval = setInterval(checkExpiry, 60 * 1000);
    return () => clearInterval(interval);
  }, [store, refreshToken]);

  const value: AuthContextValue = {
    isAuthenticated: store.isAuthenticated,
    isLoading: store.isLoading,
    user: store.user,
    tokens: store.tokens,
    login: store.login,
    logout,
    refreshToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}
