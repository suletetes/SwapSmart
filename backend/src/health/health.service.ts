/**
 * Battery Health Scoring Service
 * Computes health score using weighted penalty formula and estimates range.
 *
 * Formula: healthScore = 100 - (cycle_penalty*0.30 + temp_penalty*0.20 +
 *          voltage_penalty*0.25 + age_penalty*0.15 + discharge_penalty*0.10)
 * Clamped to [0, 100]
 *
 * Estimated range: (chargeLevel/100) * 60km * (healthScore/100)
 */

export type MaintenanceRecommendation = 'NONE' | 'MONITOR' | 'SCHEDULE' | 'URGENT';

export interface BatteryHealthInput {
  batteryId: string;
  cycleCount: number;
  temperature: number; // Celsius
  voltage: number; // Volts
  ageMonths: number;
  deepDischargeCount: number;
  chargeLevel: number; // 0-100
}

export interface BatteryHealthResult {
  healthScore: number;
  estimatedRange: number; // km
  maintenanceRecommendation: MaintenanceRecommendation;
  predictedRemainingCycles: number;
  penalties: {
    cycle: number;
    temperature: number;
    voltage: number;
    age: number;
    discharge: number;
  };
}

// Battery specification constants
const MAX_RANGE_KM = 60;
const MAX_CYCLES = 1200;
const OPTIMAL_TEMP_MIN = 20;
const OPTIMAL_TEMP_MAX = 35;
const NOMINAL_VOLTAGE = 52.0;
const MIN_SAFE_VOLTAGE = 44.0;
const MAX_AGE_MONTHS = 36;
const MAX_DEEP_DISCHARGES = 100;

/**
 * Compute cycle penalty (0-100).
 * Linear degradation based on cycle count vs max rated cycles.
 */
function computeCyclePenalty(cycleCount: number): number {
  if (cycleCount <= 0) return 0;
  const ratio = Math.min(cycleCount / MAX_CYCLES, 1.0);
  return ratio * 100;
}

/**
 * Compute temperature penalty (0-100).
 * Penalty increases when operating outside optimal range.
 */
function computeTemperaturePenalty(temperature: number): number {
  if (temperature >= OPTIMAL_TEMP_MIN && temperature <= OPTIMAL_TEMP_MAX) {
    return 0;
  }
  if (temperature < OPTIMAL_TEMP_MIN) {
    const deviation = OPTIMAL_TEMP_MIN - temperature;
    return Math.min((deviation / 20) * 100, 100);
  }
  // Above optimal
  const deviation = temperature - OPTIMAL_TEMP_MAX;
  return Math.min((deviation / 15) * 100, 100);
}

/**
 * Compute voltage penalty (0-100).
 * Penalty for voltage drop below nominal.
 */
function computeVoltagePenalty(voltage: number): number {
  if (voltage >= NOMINAL_VOLTAGE) return 0;
  if (voltage <= MIN_SAFE_VOLTAGE) return 100;
  const range = NOMINAL_VOLTAGE - MIN_SAFE_VOLTAGE;
  const drop = NOMINAL_VOLTAGE - voltage;
  return (drop / range) * 100;
}

/**
 * Compute age penalty (0-100).
 * Linear degradation based on battery age.
 */
function computeAgePenalty(ageMonths: number): number {
  if (ageMonths <= 0) return 0;
  const ratio = Math.min(ageMonths / MAX_AGE_MONTHS, 1.0);
  return ratio * 100;
}

/**
 * Compute deep discharge penalty (0-100).
 * Penalty for excessive deep discharge events.
 */
function computeDischargePenalty(deepDischargeCount: number): number {
  if (deepDischargeCount <= 0) return 0;
  const ratio = Math.min(deepDischargeCount / MAX_DEEP_DISCHARGES, 1.0);
  return ratio * 100;
}

/**
 * Determine maintenance recommendation based on health score.
 */
function getMaintenanceRecommendation(healthScore: number): MaintenanceRecommendation {
  if (healthScore >= 85) return 'NONE';
  if (healthScore >= 70) return 'MONITOR';
  if (healthScore >= 50) return 'SCHEDULE';
  return 'URGENT';
}

/**
 * Estimate remaining useful cycles based on current health.
 */
function estimateRemainingCycles(cycleCount: number, healthScore: number): number {
  const usedRatio = cycleCount / MAX_CYCLES;
  const healthFactor = healthScore / 100;
  const remaining = Math.max(0, Math.round((1 - usedRatio) * MAX_CYCLES * healthFactor));
  return remaining;
}

/**
 * Compute battery health score and related metrics.
 * Returns null if input data is insufficient for reliable scoring.
 */
export function computeBatteryHealth(input: BatteryHealthInput): BatteryHealthResult | null {
  // Validate minimum required inputs
  if (
    input.cycleCount < 0 ||
    input.voltage <= 0 ||
    input.ageMonths < 0 ||
    input.chargeLevel < 0 ||
    input.chargeLevel > 100
  ) {
    return null;
  }

  // Compute individual penalties
  const cyclePenalty = computeCyclePenalty(input.cycleCount);
  const tempPenalty = computeTemperaturePenalty(input.temperature);
  const voltagePenalty = computeVoltagePenalty(input.voltage);
  const agePenalty = computeAgePenalty(input.ageMonths);
  const dischargePenalty = computeDischargePenalty(input.deepDischargeCount);

  // Weighted health score formula
  const weightedPenalty =
    cyclePenalty * 0.30 +
    tempPenalty * 0.20 +
    voltagePenalty * 0.25 +
    agePenalty * 0.15 +
    dischargePenalty * 0.10;

  // Clamp to [0, 100]
  const healthScore = Math.max(0, Math.min(100, Math.round(100 - weightedPenalty)));

  // Estimated range: (chargeLevel/100) * 60km * (healthScore/100)
  const estimatedRange = Math.round(
    (input.chargeLevel / 100) * MAX_RANGE_KM * (healthScore / 100) * 10
  ) / 10;

  const maintenanceRecommendation = getMaintenanceRecommendation(healthScore);
  const predictedRemainingCycles = estimateRemainingCycles(input.cycleCount, healthScore);

  return {
    healthScore,
    estimatedRange,
    maintenanceRecommendation,
    predictedRemainingCycles,
    penalties: {
      cycle: Math.round(cyclePenalty * 10) / 10,
      temperature: Math.round(tempPenalty * 10) / 10,
      voltage: Math.round(voltagePenalty * 10) / 10,
      age: Math.round(agePenalty * 10) / 10,
      discharge: Math.round(dischargePenalty * 10) / 10,
    },
  };
}
