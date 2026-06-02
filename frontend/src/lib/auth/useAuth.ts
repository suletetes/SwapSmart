'use client';

import { useAuthContext } from './AuthProvider';

/**
 * Hook exposing auth state, user profile, and role.
 * Must be used within an AuthProvider.
 */
export function useAuth() {
  const context = useAuthContext();

  return {
    // State
    isAuthenticated: context.isAuthenticated,
    isLoading: context.isLoading,
    user: context.user,
    tokens: context.tokens,

    // Derived
    role: context.user?.role ?? null,
    userId: context.user?.userId ?? null,
    isDriver: context.user?.role === 'Driver',
    isOperator: context.user?.role === 'Operator',
    isFleetManager: context.user?.role === 'FleetManager',

    // Actions
    login: context.login,
    logout: context.logout,
    refreshToken: context.refreshToken,
  };
}
