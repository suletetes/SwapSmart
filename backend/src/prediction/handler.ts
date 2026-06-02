import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { success, badRequest, internalError, notFound } from '../shared/response.js';
import { predictSwapTime, forecastDemand } from './prediction.service.js';
import type { PredictionInput } from './prediction.service.js';

/**
 * Prediction Service Lambda Handler
 * Provides AI-powered swap time recommendations and demand forecasting.
 *
 * Endpoints:
 * - GET /v1/predictions/swap-time — Recommended swap time for driver
 * - GET /v1/operator/forecast — 6-hour demand forecast for station
 */
export async function handler(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const { httpMethod, path } = event;

  try {
    if (httpMethod === 'OPTIONS') {
      return success({ message: 'OK' });
    }

    if (httpMethod === 'GET' && path === '/v1/predictions/swap-time') {
      return handleSwapTimePrediction(event);
    }

    if (httpMethod === 'GET' && path === '/v1/operator/forecast') {
      return handleDemandForecast(event);
    }

    return notFound('Route not found');
  } catch (err) {
    console.error('Prediction handler error:', err);
    return internalError();
  }
}

/**
 * GET /v1/predictions/swap-time
 * Returns recommended swap time for the authenticated driver.
 *
 * Query params:
 * - batteryLevel (optional): Current battery percentage
 * - stationId (optional): Target station for prediction context
 */
function handleSwapTimePrediction(
  event: APIGatewayProxyEvent
): APIGatewayProxyResult {
  const params = event.queryStringParameters || {};

  // Extract driver ID from auth context (Cognito JWT claims)
  const driverId =
    event.requestContext?.authorizer?.claims?.sub ||
    params.driverId ||
    'demo-driver';

  const input: PredictionInput = {
    driverId,
    stationId: params.stationId || undefined,
    currentBatteryLevel: params.batteryLevel
      ? Number(params.batteryLevel)
      : undefined,
    currentHour: new Date().getHours(),
    dayOfWeek: new Date().getDay(),
    historicalAvgSwaps: 15, // Would come from DynamoDB in production
  };

  // Validate battery level if provided
  if (
    input.currentBatteryLevel !== undefined &&
    (input.currentBatteryLevel < 0 || input.currentBatteryLevel > 100)
  ) {
    return badRequest('Battery level must be between 0 and 100');
  }

  const prediction = predictSwapTime(input);

  return success({
    prediction: {
      predictedDemand: prediction.predictedDemand,
      confidence: prediction.confidence,
      recommendedAction: prediction.recommendedAction,
      optimalTime: prediction.optimalTime,
      waitTime: prediction.waitTime,
      reasoning: prediction.reasoning,
    },
    generatedAt: new Date().toISOString(),
  });
}

/**
 * GET /v1/operator/forecast
 * Returns 6-hour demand forecast for a station.
 *
 * Query params:
 * - stationId (required): Station to forecast for
 */
function handleDemandForecast(
  event: APIGatewayProxyEvent
): APIGatewayProxyResult {
  const params = event.queryStringParameters || {};
  const stationId = params.stationId;

  if (!stationId) {
    return badRequest('stationId query parameter is required');
  }

  const input: PredictionInput = {
    stationId,
    currentHour: new Date().getHours(),
    dayOfWeek: new Date().getDay(),
    historicalAvgSwaps: 18, // Would come from DynamoDB in production
  };

  const forecast = forecastDemand(input);

  return success({
    forecast: {
      stationId,
      hourlyForecast: forecast.hourlyForecast,
      peakHour: forecast.peakHour,
      recommendation: forecast.recommendation,
      confidence: forecast.confidence,
    },
    generatedAt: new Date().toISOString(),
  });
}
