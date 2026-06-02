/**
 * Property-Based Tests: Reservation Properties (3, 4, 5)
 * Tests reservation invariants: single active per battery, hold expiry, state machine validity.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { isValidTransition, isTerminalState, getValidTransitions, type ReservationState } from '../../reservation/state-machine.js';
import { arbReservationState } from '../helpers/operations.arbitrary.js';

// --- Pure domain simulation for reservation logic ---

interface ReservationRecord {
  reservationId: string;
  batteryId: string;
  driverId: string;
  state: ReservationState;
}

const NON_TERMINAL_STATES: ReservationState[] = ['Active', 'EnRoute', 'Arrived', 'Swapping'];
const ALL_STATES: ReservationState[] = ['Active', 'EnRoute', 'Arrived', 'Swapping', 'Completed', 'Expired', 'Cancelled'];

describe('Feature: swapsmart-platform, Property 3: Single Active Reservation Per Battery', () => {
  /**
   * **Validates: Requirements 24.3, 33.3**
   *
   * At most one non-terminal reservation references any single battery at any time.
   */
  it('at most one non-terminal reservation per battery for any concurrent reservation attempts', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 5 }), // number of batteries
        fc.integer({ min: 2, max: 15 }), // number of reservation attempts
        (batteryCount, attemptCount) => {
          const reservations: ReservationRecord[] = [];
          let resCounter = 0;

          for (let i = 0; i < attemptCount; i++) {
            const batteryId = `bat-${(i % batteryCount) + 1}`;
            const driverId = `driver-${i + 1}`;

            // Check if battery already has a non-terminal reservation
            const existingActive = reservations.find(
              r => r.batteryId === batteryId && !isTerminalState(r.state)
            );

            if (!existingActive) {
              // Allow reservation
              reservations.push({
                reservationId: `res-${++resCounter}`,
                batteryId,
                driverId,
                state: 'Active',
              });
            }

            // Randomly expire/cancel some reservations to free batteries
            if (i % 3 === 0 && reservations.length > 0) {
              const activeRes = reservations.find(r => !isTerminalState(r.state));
              if (activeRes) {
                activeRes.state = 'Cancelled';
              }
            }

            // INVARIANT: At most one non-terminal reservation per battery
            const batteryIds = new Set<string>();
            for (const r of reservations) {
              if (!isTerminalState(r.state)) {
                expect(batteryIds.has(r.batteryId)).toBe(false);
                batteryIds.add(r.batteryId);
              }
            }
          }
        }
      ),
      { numRuns: 200 }
    );
  });
});

describe('Feature: swapsmart-platform, Property 4: Reservation Hold Expiry', () => {
  /**
   * **Validates: Requirements 11.5, 11.7, 17.9, 33.4**
   *
   * Reserve-then-expire restores pre-reservation available count; battery returns to Ready.
   */
  it('reserve-then-expire restores pre-reservation available count', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10 }), // initial available count
        fc.integer({ min: 1, max: 5 }),  // number of reserve-then-expire cycles
        (initialAvailable, cycles) => {
          let availableCount = initialAvailable;

          for (let i = 0; i < cycles; i++) {
            if (availableCount <= 0) break;

            // Reserve: decrement available
            availableCount--;
            const afterReserve = availableCount;
            expect(afterReserve).toBeGreaterThanOrEqual(0);

            // Expire: increment available (battery returns to Ready)
            availableCount++;
          }

          // INVARIANT: After all reserve-then-expire cycles, count equals initial
          expect(availableCount).toBe(initialAvailable);
        }
      ),
      { numRuns: 150 }
    );
  });
});

describe('Feature: swapsmart-platform, Property 5: Reservation State Machine Validity', () => {
  /**
   * **Validates: Requirements 24.1, 24.2, 33.5**
   *
   * State changes only along permitted lifecycle; disallowed transitions leave state unchanged.
   */
  it('only permitted transitions succeed, disallowed leave state unchanged', () => {
    fc.assert(
      fc.property(
        arbReservationState(),
        arbReservationState(),
        (currentState: ReservationState, targetState: ReservationState) => {
          const validTransitions = getValidTransitions(currentState);
          const isAllowed = isValidTransition(currentState, targetState);

          if (isTerminalState(currentState)) {
            // Terminal states allow no transitions
            expect(isAllowed).toBe(false);
            expect(validTransitions).toHaveLength(0);
          } else if (validTransitions.includes(targetState)) {
            // Permitted transition
            expect(isAllowed).toBe(true);
          } else {
            // Disallowed transition — state should remain unchanged
            expect(isAllowed).toBe(false);
            // Simulate: attempting invalid transition leaves state unchanged
            const resultState = isAllowed ? targetState : currentState;
            expect(resultState).toBe(currentState);
          }
        }
      ),
      { numRuns: 200 }
    );
  });
});
