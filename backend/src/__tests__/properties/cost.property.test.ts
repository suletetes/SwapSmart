/**
 * Property-Based Tests: Cost-Savings Consistency (Property 17)
 * Tests that fleet total savings = petrol_equivalent_cost - actual_electric_cost.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// --- Pure cost calculation logic ---

interface VehicleCostData {
  vehicleId: string;
  distanceKm: number;
  electricCostPerKm: number;  // ₦ per km for electric
  petrolCostPerKm: number;    // ₦ per km for petrol equivalent
}

interface CostAnalysisResult {
  totalElectricCost: number;
  totalPetrolCost: number;
  totalSavings: number;
  perVehicleSavings: Array<{ vehicleId: string; savings: number }>;
}

function computeCostAnalysis(vehicles: VehicleCostData[]): CostAnalysisResult {
  let totalElectricCost = 0;
  let totalPetrolCost = 0;
  const perVehicleSavings: Array<{ vehicleId: string; savings: number }> = [];

  for (const v of vehicles) {
    const electricCost = v.distanceKm * v.electricCostPerKm;
    const petrolCost = v.distanceKm * v.petrolCostPerKm;
    const savings = petrolCost - electricCost;

    totalElectricCost += electricCost;
    totalPetrolCost += petrolCost;
    perVehicleSavings.push({ vehicleId: v.vehicleId, savings });
  }

  return {
    totalElectricCost,
    totalPetrolCost,
    totalSavings: totalPetrolCost - totalElectricCost,
    perVehicleSavings,
  };
}

// --- Arbitrary ---

function arbVehicleCostData(): fc.Arbitrary<VehicleCostData> {
  return fc.record({
    vehicleId: fc.stringOf(fc.constantFrom('v', '1', '2', '3', '4'), { minLength: 2, maxLength: 4 }).map(s => `vehicle-${s}`),
    distanceKm: fc.double({ min: 0, max: 500, noNaN: true }),
    electricCostPerKm: fc.double({ min: 5, max: 30, noNaN: true }),
    petrolCostPerKm: fc.double({ min: 20, max: 100, noNaN: true }),
  });
}

describe('Feature: swapsmart-platform, Property 17: Cost-Savings Consistency', () => {
  /**
   * **Validates: Requirements 21.3, 33.17**
   *
   * Fleet total savings = petrol_equivalent_cost - actual_electric_cost for any period.
   */
  it('savings = petrol_cost - electric_cost', () => {
    fc.assert(
      fc.property(
        fc.array(arbVehicleCostData(), { minLength: 1, maxLength: 20 }),
        (vehicles: VehicleCostData[]) => {
          const result = computeCostAnalysis(vehicles);

          // INVARIANT: totalSavings = totalPetrolCost - totalElectricCost
          const expectedSavings = result.totalPetrolCost - result.totalElectricCost;
          expect(Math.abs(result.totalSavings - expectedSavings)).toBeLessThan(0.001);

          // INVARIANT: sum of per-vehicle savings = total savings
          const sumPerVehicle = result.perVehicleSavings.reduce((sum, v) => sum + v.savings, 0);
          expect(Math.abs(sumPerVehicle - result.totalSavings)).toBeLessThan(0.001);

          // INVARIANT: costs are non-negative (distance and rates are non-negative)
          expect(result.totalElectricCost).toBeGreaterThanOrEqual(0);
          expect(result.totalPetrolCost).toBeGreaterThanOrEqual(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});
