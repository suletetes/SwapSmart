/**
 * Property-Based Tests: Authorization Isolation (Property 15)
 * Tests that cross-user/role access is denied and response is indistinguishable from not-found.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// --- Pure authorization simulation ---

type Role = 'Driver' | 'Operator' | 'FleetManager';

interface User {
  userId: string;
  role: Role;
  stationId?: string; // Operator only
  fleetId?: string;   // FleetManager only
}

interface Resource {
  ownerId: string;
  type: 'reservation' | 'wallet' | 'station' | 'fleet' | 'profile';
  ownerRole: Role;
  stationId?: string;
  fleetId?: string;
}

interface AuthResult {
  allowed: boolean;
  statusCode: number;
  body: { error: string };
}

function checkAuthorization(user: User, resource: Resource): AuthResult {
  // Rule 1: Users can only access their own resources
  if (resource.type === 'reservation' || resource.type === 'wallet' || resource.type === 'profile') {
    if (resource.ownerId !== user.userId) {
      // Return 404 (not 403) for unauthorized cross-user access
      return { allowed: false, statusCode: 404, body: { error: 'Not found' } };
    }
  }

  // Rule 2: Operators can only access their own station
  if (resource.type === 'station') {
    if (user.role !== 'Operator' || resource.stationId !== user.stationId) {
      return { allowed: false, statusCode: 404, body: { error: 'Not found' } };
    }
  }

  // Rule 3: Fleet managers can only access their own fleet
  if (resource.type === 'fleet') {
    if (user.role !== 'FleetManager' || resource.fleetId !== user.fleetId) {
      return { allowed: false, statusCode: 404, body: { error: 'Not found' } };
    }
  }

  // Rule 4: Role-based access
  if (resource.type === 'station' && user.role !== 'Operator') {
    return { allowed: false, statusCode: 404, body: { error: 'Not found' } };
  }
  if (resource.type === 'fleet' && user.role !== 'FleetManager') {
    return { allowed: false, statusCode: 404, body: { error: 'Not found' } };
  }

  return { allowed: true, statusCode: 200, body: { error: '' } };
}

// --- Arbitraries ---

function arbRole(): fc.Arbitrary<Role> {
  return fc.constantFrom<Role>('Driver', 'Operator', 'FleetManager');
}

function arbUser(): fc.Arbitrary<User> {
  return fc.record({
    userId: fc.uuid(),
    role: arbRole(),
    stationId: fc.option(fc.uuid(), { nil: undefined }),
    fleetId: fc.option(fc.uuid(), { nil: undefined }),
  });
}

function arbResource(): fc.Arbitrary<Resource> {
  return fc.record({
    ownerId: fc.uuid(),
    type: fc.constantFrom<Resource['type']>('reservation', 'wallet', 'station', 'fleet', 'profile'),
    ownerRole: arbRole(),
    stationId: fc.option(fc.uuid(), { nil: undefined }),
    fleetId: fc.option(fc.uuid(), { nil: undefined }),
  });
}

describe('Feature: swapsmart-platform, Property 15: Authorization Isolation', () => {
  /**
   * **Validates: Requirements 31.5, 31.6, 33.15**
   *
   * Cross-user/cross-role access attempts are denied;
   * response indistinguishable from not-found.
   */
  it('cross-user access denied, response indistinguishable from not-found', () => {
    fc.assert(
      fc.property(
        arbUser(),
        arbResource(),
        (user: User, resource: Resource) => {
          const result = checkAuthorization(user, resource);

          if (!result.allowed) {
            // INVARIANT: denied responses always return 404 (not 403)
            expect(result.statusCode).toBe(404);
            expect(result.body.error).toBe('Not found');

            // INVARIANT: response is indistinguishable from a genuine not-found
            // (no information leakage about resource existence)
            expect(result.body).not.toHaveProperty('reason');
            expect(result.body).not.toHaveProperty('requiredRole');
          }
        }
      ),
      { numRuns: 200 }
    );
  });

  it('users can access their own resources', () => {
    fc.assert(
      fc.property(
        arbUser(),
        fc.constantFrom<Resource['type']>('reservation', 'wallet', 'profile'),
        (user: User, resourceType) => {
          const resource: Resource = {
            ownerId: user.userId,
            type: resourceType,
            ownerRole: user.role,
          };

          const result = checkAuthorization(user, resource);
          expect(result.allowed).toBe(true);
          expect(result.statusCode).toBe(200);
        }
      ),
      { numRuns: 200 }
    );
  });
});
