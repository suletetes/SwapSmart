/**
 * Property-Based Tests: Health Score Bounds (Property 12)
 * Tests that health score is always in [0, 100] and estimated range ≥ 0.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { computeBatteryHealth, type BatteryHealthInput } from '../../health/health.service.js';

// --- Arbitrary for valid battery health inputs ---

function arbBatteryHealthInput(): fc.Arbitrary<BatteryHealthInput> {
  return fc.record({
    batteryId: fc.uuid(),
    cycleCount: fc.integer({ min: 0, max: 2000 }),
    temperature: fc.double({ min: -10, max: 60, noNaN: true }),
    voltage: fc.double({ min: 30, max: 60, noNaN: true }),
    ageMonths: fc.integer({ min: 0, max: 60 }),
    deepDischargeCount: fc.integer({ min: 0, max: 200 }),
    chargeLevel: fc.integer({ min: 0, max: 100 }),
  });
}

describe('Feature: swapsmart-platform, Property 12: Health Score Bounds', () => {
  /**
   * **Validates: Requirements 27.3, 27.4, 33.12**
   *
   * Health score always in [0, 100]; estimated range always ≥ 0 for any inputs.
   */
  it('health score in [0, 100] for any valid inputs', () => {
    fc.assert(
      fc.property(
        arbBatteryHealthInput(),
        (input: BatteryHealthInput) => {
          const result = computeBatteryHealth(input);

          if (result === null) {
            // null is acceptable for invalid inputs (negative values, etc.)
            // But our arbitrary generates valid inputs, so this shouldn't happen
            // unless voltage is 0 (which we avoid with min: 30)
            return;
          }

          // INVARIANT: health score in [0, 100]
          expect(result.healthScore).toBeGreaterThanOrEqual(0);
          expect(result.healthScore).toBeLessThanOrEqual(100);

          // INVARIANT: estimated range ≥ 0
          expect(result.estimatedRange).toBeGreaterThanOrEqual(0);

          // Additional bounds checks
          expect(result.predictedRemainingCycles).toBeGreaterThanOrEqual(0);

          // Penalties should be non-negative
          expect(result.penalties.cycle).toBeGreaterThanOrEqual(0);
          expect(result.penalties.temperature).toBeGreaterThanOrEqual(0);
          expect(result.penalties.voltage).toBeGreaterThanOrEqual(0);
          expect(result.penalties.age).toBeGreaterThanOrEqual(0);
          expect(result.penalties.discharge).toBeGreaterThanOrEqual(0);
        }
      ),
      { numRuns: 200 }
    );
  });

  it('estimated range is bounded by max range (60km)', () => {
    fc.assert(
      fc.property(
        arbBatteryHealthInput(),
        (input: BatteryHealthInput) => {
          const result = computeBatteryHealth(input);
          if (result === null) return;

          // Max possible range: 60km (when chargeLevel=100 and healthScore=100)
          expect(result.estimatedRange).toBeLessThanOrEqual(60);
        }
      ),
      { numRuns: 200 }
    );
  });
});
