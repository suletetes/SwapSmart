import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Next.js middleware for server-side auth checks on protected routes.
 * Checks for auth token in cookies and redirects unauthenticated users.
 */

// Routes that require authentication
const protectedPaths = [
  '/driver',
  '/operator',
  '/fleet',
  '/profile',
  '/wallet',
  '/notifications',
  '/settings',
];

// Routes that are public (no auth required)
const publicPaths = [
  '/login',
  '/register',
  '/onboarding',
  '/',
];

// Role-based route restrictions
const roleRoutes: Record<string, string[]> = {
  Driver: ['/driver', '/wallet', '/profile', '/notifications'],
  Operator: ['/operator', '/profile', '/notifications', '/settings'],
  FleetManager: ['/fleet', '/profile', '/notifications', '/settings'],
};

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip static assets and API routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/static') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Check if route is protected
  const isProtected = protectedPaths.some((path) => pathname.startsWith(path));
  const isPublic = publicPaths.some((path) => pathname === path);

  // Get auth token from cookie
  const token = request.cookies.get('swapsmart-access-token')?.value;
  const userRole = request.cookies.get('swapsmart-user-role')?.value;

  // Redirect unauthenticated users from protected routes to login
  if (isProtected && !token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect authenticated users from login/register to their role-specific home
  if (isPublic && token && userRole && (pathname === '/login' || pathname === '/register')) {
    const homeRoute = getRoleHome(userRole);
    return NextResponse.redirect(new URL(homeRoute, request.url));
  }

  // Check role-based access
  if (isProtected && token && userRole) {
    const allowedPaths = roleRoutes[userRole] || [];
    const hasAccess = allowedPaths.some((path) => pathname.startsWith(path));

    if (!hasAccess) {
      const homeRoute = getRoleHome(userRole);
      return NextResponse.redirect(new URL(homeRoute, request.url));
    }
  }

  return NextResponse.next();
}

function getRoleHome(role: string): string {
  switch (role) {
    case 'Driver':
      return '/driver';
    case 'Operator':
      return '/operator';
    case 'FleetManager':
      return '/fleet';
    default:
      return '/login';
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};
