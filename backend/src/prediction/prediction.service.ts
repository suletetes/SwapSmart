/**
 * Prediction Service
 * Provides AI-powered demand forecasting and swap time recommendations.
 * For hackathon MVP: Uses structured mock responses simulating Bedrock output.
 */

export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export interface SwapTimePrediction {
  predictedDemand: number;
  confidence: ConfidenceLevel;
  recommendedAction: string;
  optimalTime: string;
  waitTime: number; // minutes
  reasoning: string;
}

export interface DemandForecast {
  hourlyForecast: HourlyDemand[];
  peakHour: string;
  recommendation: string;
  confidence: ConfidenceLevel;
}

export interface HourlyDemand {
  hour: string;
  predictedSwaps: number;
  confidence: ConfidenceLevel;
}

export interface PredictionInput {
  driverId?: string;
  stationId?: string;
  currentBatteryLevel?: number;
  currentHour?: number;
  dayOfWeek?: number;
  historicalAvgSwaps?: number;
}

/**
 * Generate a structured prompt for Bedrock (mock for hackathon).
 * In production, this would call Amazon Bedrock with historical data context.
 */
export function buildBedrockPrompt(input: PredictionInput): string {
  return `Given the following context:
- Current hour: ${input.currentHour ?? new Date().getHours()}
- Day of week: ${input.dayOfWeek ?? new Date().getDay()}
- Driver battery level: ${input.currentBatteryLevel ?? 'unknown'}%
- Station historical average: ${input.historicalAvgSwaps ?? 15} swaps/day
- Station ID: ${input.stationId ?? 'unknown'}

Predict the optimal swap time and expected demand for the next 6 hours.
Return JSON with: predictedDemand, confidence, recommendedAction, optimalTime, waitTime.`;
}

/**
 * Predict optimal swap time for a driver.
 * Hackathon MVP: Returns realistic mock data based on time-of-day patterns.
 */
export function predictSwapTime(input: PredictionInput): SwapTimePrediction {
  // Validate minimum inputs
  if (!input.driverId && !input.currentBatteryLevel) {
    return {
      predictedDemand: 0,
      confidence: 'LOW',
      recommendedAction: 'Prediction unavailable — insufficient data',
      optimalTime: '',
      waitTime: 0,
      reasoning: 'Not enough input data to generate a reliable prediction.',
    };
  }

  const hour = input.currentHour ?? new Date().getHours();
  const batteryLevel = input.currentBatteryLevel ?? 50;

  // Time-based demand patterns (Lagos keke traffic)
  const demandByHour: Record<number, number> = {
    6: 12, 7: 18, 8: 22, 9: 20, 10: 15, 11: 12,
    12: 14, 13: 16, 14: 13, 15: 14, 16: 18, 17: 24,
    18: 20, 19: 15, 20: 10, 21: 6, 22: 3,
  };

  const predictedDemand = demandByHour[hour] ?? 8;
  const peakSoon = hour >= 6 && hour <= 9 || hour >= 16 && hour <= 18;

  // Determine confidence based on data quality
  let confidence: ConfidenceLevel = 'HIGH';
  if (!input.historicalAvgSwaps) confidence = 'MEDIUM';
  if (!input.currentBatteryLevel) confidence = 'LOW';

  // Calculate optimal swap time
  let optimalHour = hour;
  if (batteryLevel > 40 && peakSoon) {
    // Battery still good, wait for off-peak
    optimalHour = hour <= 9 ? 10 : 19;
  } else if (batteryLevel <= 20) {
    // Urgent — swap now
    optimalHour = hour;
  } else {
    // Find next low-demand window
    optimalHour = hour + 1;
  }

  const optimalTime = `${String(optimalHour).padStart(2, '0')}:${batteryLevel <= 20 ? '00' : '30'}`;
  const waitTime = peakSoon ? Math.floor(Math.random() * 8) + 5 : Math.floor(Math.random() * 4) + 2;

  let recommendedAction: string;
  if (batteryLevel <= 20) {
    recommendedAction = 'Swap immediately — battery critically low';
  } else if (batteryLevel <= 40 && peakSoon) {
    recommendedAction = `Swap within 30 minutes to avoid peak wait times`;
  } else if (peakSoon) {
    recommendedAction = `Wait until ${optimalTime} for shorter queues`;
  } else {
    recommendedAction = `Good time to swap — low demand expected`;
  }

  return {
    predictedDemand,
    confidence,
    recommendedAction,
    optimalTime,
    waitTime,
    reasoning: `Based on time-of-day patterns and current battery level of ${batteryLevel}%.`,
  };
}

/**
 * Generate 6-hour demand forecast for a station.
 * Hackathon MVP: Returns realistic mock data based on time patterns.
 */
export function forecastDemand(input: PredictionInput): DemandForecast {
  if (!input.stationId) {
    return {
      hourlyForecast: [],
      peakHour: '',
      recommendation: 'Prediction unavailable — no station specified',
      confidence: 'LOW',
    };
  }

  const currentHour = input.currentHour ?? new Date().getHours();
  const baseAvg = input.historicalAvgSwaps ?? 15;

  // Generate 6-hour forecast
  const hourlyForecast: HourlyDemand[] = [];
  let maxDemand = 0;
  let peakHour = '';

  for (let i = 0; i < 6; i++) {
    const forecastHour = (currentHour + i) % 24;
    const hourStr = `${String(forecastHour).padStart(2, '0')}:00`;

    // Demand multiplier based on time of day
    let multiplier = 1.0;
    if (forecastHour >= 7 && forecastHour <= 9) multiplier = 1.8;
    else if (forecastHour >= 16 && forecastHour <= 18) multiplier = 2.0;
    else if (forecastHour >= 12 && forecastHour <= 14) multiplier = 1.3;
    else if (forecastHour >= 21 || forecastHour <= 5) multiplier = 0.3;

    const predictedSwaps = Math.round((baseAvg / 12) * multiplier + (Math.random() * 2 - 1));
    const confidence: ConfidenceLevel = i <= 2 ? 'HIGH' : i <= 4 ? 'MEDIUM' : 'LOW';

    hourlyForecast.push({ hour: hourStr, predictedSwaps: Math.max(0, predictedSwaps), confidence });

    if (predictedSwaps > maxDemand) {
      maxDemand = predictedSwaps;
      peakHour = hourStr;
    }
  }

  // Generate recommendation
  const totalPredicted = hourlyForecast.reduce((s, h) => s + h.predictedSwaps, 0);
  let recommendation: string;
  if (totalPredicted > baseAvg * 0.8) {
    recommendation = `High demand expected. Ensure ${Math.ceil(totalPredicted * 0.3)} batteries are ready by ${peakHour}.`;
  } else {
    recommendation = `Normal demand expected. Current inventory should be sufficient.`;
  }

  return {
    hourlyForecast,
    peakHour,
    recommendation,
    confidence: 'HIGH',
  };
}
