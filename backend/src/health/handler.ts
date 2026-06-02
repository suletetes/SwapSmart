import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { z } from 'zod';
import { success, badRequest, internalError, notFound } from '../shared/response.js';
import { computeBatteryHealth } from './health.service.js';
import type { BatteryHealthInput } from './health.service.js';

/** Validation schema for health score request */
const healthRequestSchema = z.object({
  batteryId: z.string().min(1),
  cycleCount: z.coerce.number().min(0),
  temperature: z.coerce.number().min(-20).max(80),
  voltage: z.coerce.number().min(0).max(100),
  ageMonths: z.coerce.number().min(0),
  deepDischargeCount: z.coerce.number().min(0),
  chargeLevel: z.coerce.number().min(0).max(100),
});

/**
 * Health Service Lambda Handler
 * Computes battery health scores and maintenance recommendations.
 *
 * Endpoints:
 * - GET /v1/health/battery — Compute health score for a battery
 * - POST /v1/health/battery — Compute health score with body params
 */
export async function handler(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const { httpMethod, path } = event;

  try {
    if (httpMethod === 'OPTIONS') {
      return success({ message: 'OK' });
    }

    if (path === '/v1/health/battery' || path.match(/^\/v1\/health\/battery/)) {
      if (httpMethod === 'GET') {
        return handleGetBatteryHealth(event);
      }
      if (httpMethod === 'POST') {
        return handlePostBatteryHealth(event);
      }
    }

    return notFound('Route not found');
  } catch (err) {
    console.error('Health handler error:', err);
    return internalError();
  }
}

/**
 * GET /v1/health/battery
 * Compute health score from query parameters.
 * Useful for quick lookups with known battery telemetry.
 */
function handleGetBatteryHealth(
  event: APIGatewayProxyEvent
): APIGatewayProxyResult {
  const params = event.queryStringParameters || {};

  const validation = healthRequestSchema.safeParse(params);
  if (!validation.success) {
    const errors = validation.error.flatten().fieldErrors;
    return badRequest('Invalid parameters. Required: batteryId, cycleCount, temperature, voltage, ageMonths, deepDischargeCount, chargeLevel', errors);
  }

  const input: BatteryHealthInput = validation.data;
  const result = computeBatteryHealth(input);

  if (!result) {
    return badRequest('Unable to compute health score — invalid input data');
  }

  return success({
    batteryId: input.batteryId,
    healthScore: result.healthScore,
    estimatedRange: result.estimatedRange,
    maintenanceRecommendation: result.maintenanceRecommendation,
    predictedRemainingCycles: result.predictedRemainingCycles,
    penalties: result.penalties,
    computedAt: new Date().toISOString(),
  });
}

/**
 * POST /v1/health/battery
 * Compute health score from request body.
 * Supports batch processing and richer input data.
 */
function handlePostBatteryHealth(
  event: APIGatewayProxyEvent
): APIGatewayProxyResult {
  if (!event.body) {
    return badRequest('Request body is required');
  }

  let body: unknown;
  try {
    body = JSON.parse(event.body);
  } catch {
    return badRequest('Invalid JSON body');
  }

  const validation = healthRequestSchema.safeParse(body);
  if (!validation.success) {
    const errors = validation.error.flatten().fieldErrors;
    return badRequest('Invalid request body', errors);
  }

  const input: BatteryHealthInput = validation.data;
  const result = computeBatteryHealth(input);

  if (!result) {
    return badRequest('Unable to compute health score — invalid input data');
  }

  return success({
    batteryId: input.batteryId,
    healthScore: result.healthScore,
    estimatedRange: result.estimatedRange,
    maintenanceRecommendation: result.maintenanceRecommendation,
    predictedRemainingCycles: result.predictedRemainingCycles,
    penalties: result.penalties,
    computedAt: new Date().toISOString(),
  });
}
