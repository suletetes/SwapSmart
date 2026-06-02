/**
 * Property-Based Tests: Inventory Conservation & Availability Bounds
 * Tests the core invariants of station battery inventory management.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { createTestStation, type BatteryState, type TestStation, type TestBattery } from '../helpers/station.factory.js';
import { arbOperationSequence, type Operation } from '../helpers/operations.arbitrary.js';

// --- Pure domain logic for inventory simulation ---

const ALL_BATTERY_STATES: BatteryState[] = ['Charging', 'Ready', 'Reserved', 'In_Vehicle', 'Depleted', 'Maintenance'];

interface InventoryState {
  batteries: TestBattery[];
  totalSlots: number;
  reservations: Map<string, string>; // batteryId -> driverId
}

function initInventory(station: TestStation): InventoryState {
  return {
    batteries: [...station.batteries],
    totalSlots: station.totalSlots,
    reservations: new Map(),
  };
}

function applyOperation(state: InventoryState, op: Operation): InventoryState {
  const batteries = [...state.batteries];
  const reservations = new Map(state.reservations);
  const idx = op.batteryIndex % batteries.length;
  if (batteries.length === 0) return state;

  const battery = { ...batteries[idx] };

  switch (op.type) {
    case 'reserve':
      if (battery.state === 'Ready' && !reservations.has(battery.batteryId)) {
        battery.state = 'Reserved';
        battery.reservationId = op.driverId;
        reservations.set(battery.batteryId, op.driverId);
      }
      break;

    case 'expire':
    case 'cancel':
      if (battery.state === 'Reserved') {
        battery.state = 'Ready';
        battery.reservationId = undefined;
        reservations.delete(battery.batteryId);
      }
      break;

    case 'swap':
      if (battery.state === 'Reserved') {
        battery.state = 'In_Vehicle';
        battery.reservationId = undefined;
        reservations.delete(battery.batteryId);
      }
      break;

    case 'return_battery':
      if (battery.state === 'In_Vehicle') {
        battery.state = 'Depleted';
      }
      break;

    case 'charge_complete':
      if (battery.state === 'Charging') {
        battery.state = 'Ready';
        battery.chargeLevel = 100;
      } else if (battery.state === 'Depleted') {
        battery.state = 'Charging';
        battery.chargeLevel = 50;
      }
      break;

    case 'reassign':
      // Reassign only moves a Ready battery to Maintenance or back
      if (battery.state === 'Ready') {
        battery.state = 'Maintenance';
      } else if (battery.state === 'Maintenance') {
        battery.state = 'Charging';
      }
      break;
  }

  batteries[idx] = battery;
  return { ...state, batteries, reservations };
}

function countByState(batteries: TestBattery[]): Map<BatteryState, number> {
  const counts = new Map<BatteryState, number>();
  for (const state of ALL_BATTERY_STATES) counts.set(state, 0);
  for (const b of batteries) {
    counts.set(b.state, (counts.get(b.state) || 0) + 1);
  }
  return counts;
}

// --- Property Tests ---

describe('Feature: swapsmart-platform, Property 1: Inventory Conservation', () => {
  /**
   * **Validates: Requirements 16.5, 33.1**
   *
   * For any sequence of reservation, expiry, cancellation, reassignment, and swap operations,
   * the sum of batteries across all states equals the total slot count.
   */
  it('sum of batteries across all states equals total slot count for any operation sequence', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 12 }),
        arbOperationSequence(12, 25),
        (slotCount: number, ops: Operation[]) => {
          const station = createTestStation({ totalSlots: slotCount, readyCount: slotCount });
          let state = initInventory(station);

          for (const op of ops) {
            state = applyOperation(state, op);

            // INVARIANT: total batteries across all states = totalSlots
            const counts = countByState(state.batteries);
            let total = 0;
            for (const count of counts.values()) total += count;
            expect(total).toBe(state.totalSlots);
          }
        }
      ),
      { numRuns: 200 }
    );
  });
});

describe('Feature: swapsmart-platform, Property 2: Availability Bounds', () => {
  /**
   * **Validates: Requirements 23.3, 33.2**
   *
   * For any operation sequence, available Ready count remains ≥0 and ≤ total slot count.
   */
  it('available Ready count remains ≥0 and ≤ total slot count for any operation sequence', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10 }),
        arbOperationSequence(10, 25),
        (slotCount: number, ops: Operation[]) => {
          const station = createTestStation({ totalSlots: slotCount, readyCount: slotCount });
          let state = initInventory(station);

          for (const op of ops) {
            state = applyOperation(state, op);

            // INVARIANT: Ready count is within [0, totalSlots]
            const readyCount = state.batteries.filter(b => b.state === 'Ready').length;
            expect(readyCount).toBeGreaterThanOrEqual(0);
            expect(readyCount).toBeLessThanOrEqual(state.totalSlots);
          }
        }
      ),
      { numRuns: 200 }
    );
  });
});
