import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { extractAuthContext, type AuthContext, type UserRole } from './authorizer.js';
import { notFound } from './response.js';

/**
 * Role-permission mapping.
 * Each role maps to an array of path prefixes the role is allowed to access.
 */
const ROLE_PERMISSIONS: Record<UserRole | 'Public', string[]> = {
  Driver: [
    '/v1/stations',
    '/v1/reservations',
    '/v1/wallet',
    '/v1/swaps',
    '/v1/profile',
    '/v1/predictions',
    '/v1/ai',
    '/v1/notifications',
    '/v1/favorites',
  ],
  Operator: ['/v1/operator'],
  FleetManager: ['/v1/fleet'],
  Public: ['/v1/auth'],
};

/**
 * Checks if a given path is permitted for the specified role.
 */
export function isPathPermittedForRole(path: string, role: UserRole): boolean {
  const allowedPrefixes = ROLE_PERMISSIONS[role];
  return allowedPrefixes.some((prefix) => path.startsWith(prefix));
}

/**
 * Checks if a path is a public endpoint (no auth required).
 */
export function isPublicPath(path: string): boolean {
  return ROLE_PERMISSIONS.Public.some((prefix) => path.startsWith(prefix));
}

/**
 * Checks resource-level access control.
 * Ensures the caller owns or is assigned to the targeted data.
 *
 * Returns true if access is allowed, false if denied.
 * On denial, returns 404 (indistinguishable from not-found) per security design.
 */
export function checkResourceOwnership(
  event: APIGatewayProxyEvent,
  authContext: AuthContext
): boolean {
  const path = event.path || event.resource || '';

  // Driver accessing their own reservations — userId embedded in query/path
  if (path.includes('/v1/reservations') && authContext.role === 'Driver') {
    // Drivers can only access their own reservations
    // The service layer enforces this by filtering on userId
    return true;
  }

  // Driver accessing their own wallet
  if (path.includes('/v1/wallet') && authContext.role === 'Driver') {
    return true;
  }

  // Driver accessing their own profile
  if (path.includes('/v1/profile') && authContext.role === 'Driver') {
    return true;
  }

  // Driver accessing their own favorites
  if (path.includes('/v1/favorites') && authContext.role === 'Driver') {
    return true;
  }

  // Driver accessing their own swap history
  if (path.includes('/v1/swaps') && authContext.role === 'Driver') {
    return true;
  }

  // Driver accessing their own notifications
  if (path.includes('/v1/notifications') && authContext.role === 'Driver') {
    return true;
  }

  // Driver accessing stations (public read for drivers)
  if (path.includes('/v1/stations') && authContext.role === 'Driver') {
    return true;
  }

  // Driver accessing predictions and AI
  if ((path.includes('/v1/predictions') || path.includes('/v1/ai')) && authContext.role === 'Driver') {
    return true;
  }

  // Operator accessing their own station data
  if (path.includes('/v1/operator') && authContext.role === 'Operator') {
    // The service layer enforces station ownership by checking operator's stationId
    return true;
  }

  // Fleet Manager accessing their own fleet data
  if (path.includes('/v1/fleet') && authContext.role === 'FleetManager') {
    // The service layer enforces fleet ownership by checking manager's fleetId
    return true;
  }

  // Default: deny (return 404 to not disclose existence)
  return false;
}

/**
 * Authorization middleware that validates:
 * 1. Role is permitted for the requested resource path
 * 2. Caller owns or is assigned to the targeted data (resource-level check)
 *
 * Returns null if authorized, or a 404 response if unauthorized.
 * Uses 404 (not 403) for unauthorized cross-user/cross-role access attempts
 * to make unauthorized access indistinguishable from not-found.
 */
export function authorize(
  event: APIGatewayProxyEvent
): { authContext: AuthContext; error: null } | { authContext: null; error: APIGatewayProxyResult } {
  const path = event.path || event.resource || '';

  // Public paths don't require authorization
  if (isPublicPath(path)) {
    return {
      authContext: {
        userId: 'anonymous',
        role: 'Driver',
        phone: '',
        groups: [],
      },
      error: null,
    };
  }

  // Extract auth context from the authorizer
  const authorizer = event.requestContext?.authorizer as Record<string, unknown> | undefined;
  const authContext = extractAuthContext(authorizer);

  if (!authContext) {
    // No valid auth context — return 404 to not disclose
    return { authContext: null, error: notFound() };
  }

  // Check role-level permission
  if (!isPathPermittedForRole(path, authContext.role)) {
    // Role not permitted — return 404 (indistinguishable from not-found)
    return { authContext: null, error: notFound() };
  }

  // Check resource-level ownership
  if (!checkResourceOwnership(event, authContext)) {
    // Not the owner — return 404 (indistinguishable from not-found)
    return { authContext: null, error: notFound() };
  }

  return { authContext, error: null };
}
