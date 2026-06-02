import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { z } from 'zod';
import {
  success,
  created,
  badRequest,
  unauthorized,
  notFound,
  conflict,
  internalError,
} from '../shared/response.js';
import {
  createReservation,
  getActiveReservation,
  arriveAtStation,
  cancelReservation,
} from './reservation.service.js';

/** Validation schemas */
const createReservationSchema = z.object({
  stationId: z.string().min(1, 'Station ID is required'),
});

/**
 * Reservation Service Lambda Handler
 * Routes requests to the appropriate reservation operation.
 */
export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const { httpMethod, path, pathParameters } = event;

  try {
    // Extract authenticated driver ID from authorizer context
    const driverId = extractDriverId(event);

    if (httpMethod === 'POST' && path === '/v1/reservations') {
      if (!driverId) return unauthorized('Authentication required');
      return handleCreateReservation(event, driverId);
    }

    if (httpMethod === 'GET' && path === '/v1/reservations/active') {
      if (!driverId) return unauthorized('Authentication required');
      return handleGetActiveReservation(driverId);
    }

    if (httpMethod === 'PATCH' && path.match(/^\/v1\/reservations\/[^/]+\/arrive$/)) {
      if (!driverId) return unauthorized('Authentication required');
      const reservationId = pathParameters?.id || extractPathParam(path, 'reservations');
      return handleArriveAtStation(reservationId, driverId);
    }

    if (httpMethod === 'PATCH' && path.match(/^\/v1\/reservations\/[^/]+\/cancel$/)) {
      if (!driverId) return unauthorized('Authentication required');
      const reservationId = pathParameters?.id || extractPathParam(path, 'reservations');
      return handleCancelReservation(reservationId, driverId);
    }

    if (httpMethod === 'OPTIONS') {
      return success({ message: 'OK' });
    }

    return notFound('Route not found');
  } catch (err) {
    console.error('Reservation handler error:', err);
    return internalError();
  }
}

/**
 * POST /v1/reservations
 * Create a new reservation atomically.
 */
async function handleCreateReservation(
  event: APIGatewayProxyEvent,
  driverId: string
): Promise<APIGatewayProxyResult> {
  const body = parseBody(event.body);
  if (!body) {
    return badRequest('Request body is required');
  }

  const validation = createReservationSchema.safeParse(body);
  if (!validation.success) {
    const errors = validation.error.flatten().fieldErrors;
    return badRequest('Validation failed', errors);
  }

  const { stationId } = validation.data;

  const result = await createReservation({ driverId, stationId });

  if (!result.success) {
    switch (result.code) {
      case 'ACTIVE_RESERVATION_EXISTS':
        return conflict(result.error!);
      case 'NO_AVAILABILITY':
        return conflict(result.error!, { code: 'NO_AVAILABILITY' });
      case 'LOCK_CONTENTION':
        return conflict(result.error!, { code: 'LOCK_CONTENTION' });
      case 'TRANSACTION_CONFLICT':
        return conflict(result.error!, { code: 'TRANSACTION_CONFLICT' });
      default:
        return internalError(result.error);
    }
  }

  const reservation = result.reservation!;
  return created({
    reservationId: reservation.reservationId,
    stationId: reservation.stationId,
    batteryId: reservation.batteryId,
    state: reservation.state,
    createdAt: reservation.createdAt,
    expiresAt: reservation.expiresAt,
  });
}

/**
 * GET /v1/reservations/active
 * Return the driver's active (non-terminal) reservation.
 */
async function handleGetActiveReservation(driverId: string): Promise<APIGatewayProxyResult> {
  const reservation = await getActiveReservation(driverId);

  if (!reservation) {
    return success({ reservation: null });
  }

  return success({
    reservation: {
      reservationId: reservation.reservationId,
      stationId: reservation.stationId,
      batteryId: reservation.batteryId,
      state: reservation.state,
      createdAt: reservation.createdAt,
      expiresAt: reservation.expiresAt,
      swapCode: reservation.swapCode,
    },
  });
}

/**
 * PATCH /v1/reservations/{id}/arrive
 * Confirm arrival at station, generate swap code.
 */
async function handleArriveAtStation(
  reservationId: string,
  driverId: string
): Promise<APIGatewayProxyResult> {
  if (!reservationId) {
    return badRequest('Reservation ID is required');
  }

  const result = await arriveAtStation(reservationId, driverId);

  if (!result.success) {
    switch (result.code) {
      case 'NOT_FOUND':
        return notFound(result.error!);
      case 'INVALID_STATE':
        return conflict(result.error!);
      default:
        return internalError(result.error);
    }
  }

  return success({
    message: 'Arrival confirmed',
    swapCode: result.swapCode,
  });
}

/**
 * PATCH /v1/reservations/{id}/cancel
 * Cancel reservation and release battery.
 */
async function handleCancelReservation(
  reservationId: string,
  driverId: string
): Promise<APIGatewayProxyResult> {
  if (!reservationId) {
    return badRequest('Reservation ID is required');
  }

  const result = await cancelReservation(reservationId, driverId);

  if (!result.success) {
    switch (result.code) {
      case 'NOT_FOUND':
        return notFound(result.error!);
      case 'INVALID_STATE':
        return conflict(result.error!);
      default:
        return internalError(result.error);
    }
  }

  return success({ message: 'Reservation cancelled' });
}

/**
 * Extract driver ID from API Gateway authorizer context.
 */
function extractDriverId(event: APIGatewayProxyEvent): string | null {
  // From Cognito authorizer
  const claims = event.requestContext?.authorizer?.claims;
  if (claims?.sub) return claims.sub;

  // From custom authorizer
  const authorizer = event.requestContext?.authorizer;
  if (authorizer?.userId) return authorizer.userId as string;
  if (authorizer?.sub) return authorizer.sub as string;

  return null;
}

/**
 * Extract a path parameter from the URL path.
 * e.g., extractPathParam('/v1/reservations/abc-123/arrive', 'reservations') → 'abc-123'
 */
function extractPathParam(path: string, resource: string): string {
  const parts = path.split('/');
  const idx = parts.indexOf(resource);
  return idx >= 0 && idx + 1 < parts.length ? parts[idx + 1] : '';
}

/**
 * Parse JSON body from event, returning null if invalid.
 */
function parseBody(body: string | null): Record<string, unknown> | null {
  if (!body) return null;
  try {
    return JSON.parse(body) as Record<string, unknown>;
  } catch {
    return null;
  }
}
