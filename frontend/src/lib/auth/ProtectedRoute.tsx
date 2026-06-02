'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './useAuth';

type UserRole = 'Driver' | 'Operator' | 'FleetManager';

interface ProtectedRouteProps {
  /** Allowed roles for this route. If empty, any authenticated user can access. */
  allowedRoles?: UserRole[];
  /** Where to redirect unauthenticated users */
  loginPath?: string;
  /** Where to redirect unauthorized users (wrong role) */
  unauthorizedPath?: string;
  /** Content to show while checking auth */
  fallback?: React.ReactNode;
  /** Protected content */
  children: React.ReactNode;
}

/**
 * Wrapper that redirects unauthenticated users to login
 * and checks role permissions for authorized access.
 */
export function ProtectedRoute({
  allowedRoles = [],
  loginPath = '/login',
  unauthorizedPath = '/unauthorized',
  fallback,
  children,
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, role } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      router.replace(loginPath);
      return;
    }

    if (allowedRoles.length > 0 && role && !allowedRoles.includes(role)) {
      router.replace(unauthorizedPath);
    }
  }, [isAuthenticated, isLoading, role, allowedRoles, loginPath, unauthorizedPath, router]);

  // Show loading state
  if (isLoading) {
    return (
      <>
        {fallback || (
          <div className="flex items-center justify-center min-h-dvh">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full motion-safe:animate-spin" />
          </div>
        )}
      </>
    );
  }

  // Not authenticated
  if (!isAuthenticated) {
    return null;
  }

  // Wrong role
  if (allowedRoles.length > 0 && role && !allowedRoles.includes(role)) {
    return null;
  }

  return <>{children}</>;
}
