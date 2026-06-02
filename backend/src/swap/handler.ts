import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';
import {
  success,
  badRequest,
  unauthorized,
  notFound,
  conflict,
  internalError,
} from '../shared/response.js';
import {
  startSwap,
  completeSwap,
  rateSwap,
  getSwapHistory,
  getReservation,
} from './swap.service.js';

const eventBridgeClient = new EventBridgeClient({
  region: process.env.AWS_REGION || 'af-south-1',
});

const EVENT_BUS_NAME = process.env.EVENT_BUS_NAME || 'swapsmart-events-dev';

/**
 * Swap Service Lambda Handler
 * Routes requests to the appropriate swap operation based on path and method.
 */
export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const { httpMethod, path } = event;

  try {
    // PATCH /v1/operator/reservations/{id}/start-swap
    if (httpMethod === 'PATCH' && path.match(/\/v1\/operator\/reservations\/[^/]+\/start-swap$/)) {
      return handleStartSwap(event);
    }

    // PATCH /v1/operator/reservations/{id}/complete-swap
    if (httpMethod === 'PATCH' && path.match(/\/v1\/operator\/reservations\/[^/]+\/complete-swap$/)) {
      return handleCompleteSwap(event);
    }

    // POST /v1/swaps/{id}/rate
    if (httpMethod === 'POST' && path.match(/\/v1\/swaps\/[^/]+\/rate$/)) {
      return handleRateSwap(event);
    }

    // GET /v1/swaps/history
    if (httpMethod === 'GET' && path === '/v1/swaps/history') {
      return handleGetHistory(event);
    }

    // OPTIONS for CORS preflight
    if (httpMethod === 'OPTIONS') {
      return success({ message: 'OK' });
    }

    return notFound('Route not found');
  } catch (err) {
    console.error('Swap handler error:', err);
    return internalError();
  }
}

/**
 * PATCH /v1/operator/reservations/{id}/start-swap
 * Validate reservation is in Arrived state, transition to Swapping. Emit SwapStarted event.
 */
async function handleStartSwap(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const reservationId = extractPathParam(event.path, 'reservations');
  if (!reservationId) {
    return badRequest('Reservation ID is required');
  }

  // Verify operator is authenticated
  const operatorId = getAuthenticatedUserId(event);
  if (!operatorId) {
    return unauthorized('Authentication required');
  }

  const result = await startSwap(reservationId);
  if (!result.success) {
    if (result.code === 'INVALID_STATE') {
      return conflict(result.error!);
    }
    return internalError(result.error);
  }

  // Emit SwapStarted event
  await emitEvent('SwapStarted', {
    reservationId,
    operatorId,
    timestamp: new Date().toISOString(),
  });

  return success({ message: 'Swap started', reservationId });
}

/**
 * PATCH /v1/operator/reservations/{id}/complete-swap
 * Atomic TransactWriteItems to finalize the swap.
 */
async function handleCompleteSwap(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const reservationId = extractPathParam(event.path, 'reservations');
  if (!reservationId) {
    return badRequest('Reservation ID is required');
  }

  const operatorId = getAuthenticatedUserId(event);
  if (!operatorId) {
    return unauthorized('Authentication required');
  }

  const body = parseBody(event.body);
  if (!body) {
    return badRequest('Request body is required');
  }

  // Validate required fields
  const { batteryReceivedId, batteryReturnedId, amount, paymentMethod } = body as {
    batteryReceivedId?: string;
    batteryReturnedId?: string;
    amount?: number;
    paymentMethod?: string;
  };

  if (!batteryReceivedId || !batteryReturnedId) {
    return badRequest('batteryReceivedId and batteryReturnedId are required');
  }

  if (typeof amount !== 'number' || amount <= 0) {
    return badRequest('amount must be a positive number');
  }

  if (!paymentMethod || !['wallet', 'cash', 'card'].includes(paymentMethod)) {
    return badRequest('paymentMethod must be one of: wallet, cash, card');
  }

  // Get reservation to extract stationId and driverId
  const reservation = await getReservation(reservationId);
  if (!reservation) {
    return notFound('Reservation not found');
  }

  const result = await completeSwap({
    reservationId,
    stationId: reservation.stationId as string,
    driverId: reservation.driverId as string,
    batteryReceivedId,
    batteryReturnedId,
    amount,
    paymentMethod: paymentMethod as 'wallet' | 'cash' | 'card',
  });

  if (!result.success) {
    if (result.code === 'INSUFFICIENT_BALANCE') {
      return conflict(result.error!);
    }
    if (result.code === 'TRANSACTION_FAILED') {
      return conflict(result.error!);
    }
    return internalError(result.error);
  }

  // Emit SwapCompleted event
  await emitEvent('SwapCompleted', {
    reservationId,
    transactionId: result.transaction!.transactionId,
    receiptId: result.transaction!.receiptId,
    stationId: reservation.stationId,
    driverId: reservation.driverId,
    amount,
    paymentMethod,
    timestamp: result.transaction!.timestamp,
  });

  return success({
    message: 'Swap completed',
    transaction: result.transaction,
  });
}

/**
 * POST /v1/swaps/{id}/rate
 * Validate rating is integer 1-5, associate with transaction.
 */
async function handleRateSwap(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const transactionId = extractPathParam(event.path, 'swaps');
  if (!transactionId) {
    return badRequest('Transaction ID is required');
  }

  const driverId = getAuthenticatedUserId(event);
  if (!driverId) {
    return unauthorized('Authentication required');
  }

  const body = parseBody(event.body);
  if (!body) {
    return badRequest('Request body is required');
  }

  const { rating } = body as { rating?: number };

  if (typeof rating !== 'number' || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    return badRequest('Rating must be an integer between 1 and 5');
  }

  const result = await rateSwap(transactionId, driverId, rating);
  if (!result.success) {
    if (result.code === 'NOT_FOUND') {
      return notFound(result.error!);
    }
    return internalError(result.error);
  }

  return success({ message: 'Rating submitted', rating });
}

/**
 * GET /v1/swaps/history
 * Query swap history for authenticated driver, paginated, filterable by date range.
 */
async function handleGetHistory(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const driverId = getAuthenticatedUserId(event);
  if (!driverId) {
    return unauthorized('Authentication required');
  }

  const params = event.queryStringParameters || {};
  const limit = params.limit ? parseInt(params.limit, 10) : 20;
  const nextToken = params.nextToken || undefined;
  const startDate = params.startDate || undefined;
  const endDate = params.endDate || undefined;

  if (limit < 1 || limit > 100) {
    return badRequest('limit must be between 1 and 100');
  }

  const result = await getSwapHistory(driverId, { limit, nextToken, startDate, endDate });

  return success({
    items: result.items,
    nextToken: result.nextToken,
    count: result.items.length,
  });
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Extract a path parameter value from the URL path.
 * e.g., extractPathParam('/v1/operator/reservations/abc123/start-swap', 'reservations') → 'abc123'
 */
function extractPathParam(path: string, segment: string): string | null {
  const parts = path.split('/');
  const idx = parts.indexOf(segment);
  if (idx === -1 || idx + 1 >= parts.length) return null;
  return parts[idx + 1];
}

/**
 * Get authenticated user ID from API Gateway authorizer context
 */
function getAuthenticatedUserId(event: APIGatewayProxyEvent): string | null {
  return (
    event.requestContext?.authorizer?.claims?.['custom:userId'] ||
    event.requestContext?.authorizer?.userId ||
    event.requestContext?.authorizer?.claims?.sub ||
    null
  );
}

/**
 * Emit an event to EventBridge
 */
async function emitEvent(detailType: string, detail: Record<string, unknown>): Promise<void> {
  try {
    await eventBridgeClient.send(
      new PutEventsCommand({
        Entries: [
          {
            Source: 'swapsmart.swap',
            DetailType: detailType,
            Detail: JSON.stringify(detail),
            EventBusName: EVENT_BUS_NAME,
          },
        ],
      })
    );
  } catch (err) {
    // Log but don't fail the request
    console.error(`Failed to emit ${detailType} event:`, err);
  }
}

/**
 * Parse JSON body from event, returning null if invalid
 */
function parseBody(body: string | null): Record<string, unknown> | null {
  if (!body) return null;
  try {
    return JSON.parse(body) as Record<string, unknown>;
  } catch {
    return null;
  }
}
