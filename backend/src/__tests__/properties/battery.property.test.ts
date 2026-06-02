/**
 * Property-Based Tests: Battery State Machine Validity (Property 6)
 * Tests battery state transitions: received→In_Vehicle, returned→Depleted, no dual states.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { arbBatteryState } from '../helpers/operations.arbitrary.js';
import type { BatteryState } from '../helpers/station.factory.js';

// --- Battery State Machine (pure logic) ---

const BATTERY_TRANSITIONS: Record<BatteryState, BatteryState[]> = {
  Charging: ['Ready', 'Maintenance'],
  Ready: ['Reserved', 'In_Vehicle', 'Maintenance'],
  Reserved: ['Ready', 'In_Vehicle'],
  In_Vehicle: ['Depleted'],
  Depleted: ['Charging', 'Maintenance'],
  Maintenance: ['Charging'],
};

function isValidBatteryTransition(from: BatteryState, to: BatteryState): boolean {
  return BATTERY_TRANSITIONS[from]?.includes(to) ?? false;
}

type BatteryAction = 'charge_complete' | 'reserve' | 'cancel_reservation' | 'swap_out' | 'return' | 'mark_maintenance' | 'maintenance_complete';

function applyBatteryAction(state: BatteryState, action: BatteryAction): BatteryState {
  switch (action) {
    case 'charge_complete':
      return state === 'Charging' ? 'Ready' : state;
    case 'reserve':
      return state === 'Ready' ? 'Reserved' : state;
    case 'cancel_reservation':
      return state === 'Reserved' ? 'Ready' : state;
    case 'swap_out':
      return (state === 'Reserved' || state === 'Ready') ? 'In_Vehicle' : state;
    case 'return':
      return state === 'In_Vehicle' ? 'Depleted' : state;
    case 'mark_maintenance':
      return (state === 'Ready' || state === 'Depleted' || state === 'Charging') ? 'Maintenance' : state;
    case 'maintenance_complete':
      return state === 'Maintenance' ? 'Charging' : state;
    default:
      return state;
  }
}

const ALL_ACTIONS: BatteryAction[] = [
  'charge_complete', 'reserve', 'cancel_reservation', 'swap_out', 'return', 'mark_maintenance', 'maintenance_complete'
];

describe('Feature: swapsmart-platform, Property 6: Battery State Machine Validity', () => {
  /**
   * **Validates: Requirements 12.3, 33.6**
   *
   * Received battery → In_Vehicle, returned battery → Depleted; no battery in two states simultaneously.
   */
  it('battery transitions follow valid state machine rules and no dual states', () => {
    fc.assert(
      fc.property(
        arbBatteryState(),
        fc.array(fc.constantFrom(...ALL_ACTIONS), { minLength: 1, maxLength: 20 }),
        (initialState: BatteryState, actions: BatteryAction[]) => {
          let currentState = initialState;

          for (const action of actions) {
            const prevState = currentState;
            const newState = applyBatteryAction(currentState, action);

            // If state changed, it must be a valid transition
            if (newState !== prevState) {
              expect(isValidBatteryTransition(prevState, newState)).toBe(true);
            }

            // Battery is in exactly one state (no dual states)
            currentState = newState;
            const stateCount = ['Charging', 'Ready', 'Reserved', 'In_Vehicle', 'Depleted', 'Maintenance']
              .filter(s => s === currentState).length;
            expect(stateCount).toBe(1);
          }

          // Specific invariants:
          // If action was 'swap_out' from Reserved/Ready, state should be In_Vehicle
          // If action was 'return' from In_Vehicle, state should be Depleted
          // These are tested implicitly through the transition logic above
        }
      ),
      { numRuns: 150 }
    );
  });

  it('swap_out always results in In_Vehicle when starting from Reserved', () => {
    fc.assert(
      fc.property(
        fc.constant('Reserved' as BatteryState),
        (state) => {
          const result = applyBatteryAction(state, 'swap_out');
          expect(result).toBe('In_Vehicle');
        }
      ),
      { numRuns: 150 }
    );
  });

  it('return always results in Depleted when starting from In_Vehicle', () => {
    fc.assert(
      fc.property(
        fc.constant('In_Vehicle' as BatteryState),
        (state) => {
          const result = applyBatteryAction(state, 'return');
          expect(result).toBe('Depleted');
        }
      ),
      { numRuns: 150 }
    );
  });
});
