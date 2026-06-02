import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { APIGatewayProxyEvent } from 'aws-lambda';
import { handler } from './handler.js';

// Mock the swap service
vi.mock('./swap.service.js', () => ({
  startSwap: vi.fn(),
  completeSwap: vi.fn(),
  rateSwap: vi.fn(),
  getSwapHistory: vi.fn(),
  getReservation: vi.fn(),
}));

// Mock EventBridge
vi.mock('@aws-sdk/client-eventbridge', () => ({
  EventBridgeClient: vi.fn().mockImplementation(() => ({
    send: vi.fn().mockResolvedValue({}),
  })),
  PutEventsCommand: vi.fn(),
}));

import { startSwap, completeSwap, rateSwap, getSwapHistory, getReservation } from './swap.service.js';

const mockStartSwap = vi.mocked(startSwap);
const mockCompleteSwap = vi.mocked(completeSwap);
const mockRateSwap = vi.mocked(rateSwap);
const mockGetSwapHistory = vi.mocked(getSwapHistory);
const mockGetReservation = vi.mocked(getReservation);

function createEvent(overrides: Partial<APIGatewayProxyEvent> = {}): APIGatewayProxyEvent {
  return {
    httpMethod: 'GET',
    path: '/',
    body: null,
    headers: {},
    multiValueHeaders: {},
    isBase64Encoded: false,
    pathParameters: null,
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    stageVariables: null,
    resource: '',
    requestContext: {
      authorizer: {
        claims: { 'custom:userId': 'user-123', sub: 'user-123' },
      },
    } as any,
    ...overrides,
  } as APIGatewayProxyEvent;
}

describe('Swap Handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('PATCH /v1/operator/reservations/{id}/start-swap', () => {
    it('should start a swap successfully', async () => {
      mockStartSwap.mockResolvedValue({ success: true });

      const event = createEvent({
        httpMethod: 'PATCH',
        path: '/v1/operator/reservations/res-001/start-swap',
      });

      const result = await handler(event);
      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.message).toBe('Swap started');
      expect(body.reservationId).toBe('res-001');
      expect(mockStartSwap).toHaveBeenCalledWith('res-001');
    });

    it('should return 409 if reservation is not in Arrived state', async () => {
      mockStartSwap.mockResolvedValue({
        success: false,
        error: 'Reservation is not in Arrived state',
        code: 'INVALID_STATE',
      });

      const event = createEvent({
        httpMethod: 'PATCH',
        path: '/v1/operator/reservations/res-001/start-swap',
      });

      const result = await handler(event);
      expect(result.statusCode).toBe(409);
    });

    it('should return 401 if not authenticated', async () => {
      const event = createEvent({
        httpMethod: 'PATCH',
        path: '/v1/operator/reservations/res-001/start-swap',
        requestContext: { authorizer: null } as any,
      });

      const result = await handler(event);
      expect(result.statusCode).toBe(401);
    });
  });

  describe('PATCH /v1/operator/reservations/{id}/complete-swap', () => {
    it('should complete a swap successfully', async () => {
      mockGetReservation.mockResolvedValue({
        PK: 'RESERVATION#res-001',
        SK: 'METADATA',
        stationId: 'station-001',
        driverId: 'driver-001',
        state: 'Swapping',
      });

      mockCompleteSwap.mockResolvedValue({
        success: true,
        transaction: {
          transactionId: 'tx-001',
          reservationId: 'res-001',
          stationId: 'station-001',
          driverId: 'driver-001',
          batteryReceived: 'bat-001',
          batteryReturned: 'bat-002',
          amount: 500,
          paymentMethod: 'wallet',
          receiptId: 'receipt-001',
          timestamp: '2026-06-06T10:00:00Z',
        },
      });

      const event = createEvent({
        httpMethod: 'PATCH',
        path: '/v1/operator/reservations/res-001/complete-swap',
        body: JSON.stringify({
          batteryReceivedId: 'bat-001',
          batteryReturnedId: 'bat-002',
          amount: 500,
          paymentMethod: 'wallet',
        }),
      });

      const result = await handler(event);
      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.transaction.receiptId).toBe('receipt-001');
      expect(body.transaction.amount).toBe(500);
    });

    it('should return 400 if body is missing required fields', async () => {
      const event = createEvent({
        httpMethod: 'PATCH',
        path: '/v1/operator/reservations/res-001/complete-swap',
        body: JSON.stringify({ amount: 500 }),
      });

      const result = await handler(event);
      expect(result.statusCode).toBe(400);
    });

    it('should return 400 if amount is not positive', async () => {
      const event = createEvent({
        httpMethod: 'PATCH',
        path: '/v1/operator/reservations/res-001/complete-swap',
        body: JSON.stringify({
          batteryReceivedId: 'bat-001',
          batteryReturnedId: 'bat-002',
          amount: -100,
          paymentMethod: 'wallet',
        }),
      });

      const result = await handler(event);
      expect(result.statusCode).toBe(400);
    });

    it('should return 400 if paymentMethod is invalid', async () => {
      const event = createEvent({
        httpMethod: 'PATCH',
        path: '/v1/operator/reservations/res-001/complete-swap',
        body: JSON.stringify({
          batteryReceivedId: 'bat-001',
          batteryReturnedId: 'bat-002',
          amount: 500,
          paymentMethod: 'bitcoin',
        }),
      });

      const result = await handler(event);
      expect(result.statusCode).toBe(400);
    });

    it('should return 404 if reservation not found', async () => {
      mockGetReservation.mockResolvedValue(null);

      const event = createEvent({
        httpMethod: 'PATCH',
        path: '/v1/operator/reservations/res-999/complete-swap',
        body: JSON.stringify({
          batteryReceivedId: 'bat-001',
          batteryReturnedId: 'bat-002',
          amount: 500,
          paymentMethod: 'wallet',
        }),
      });

      const result = await handler(event);
      expect(result.statusCode).toBe(404);
    });

    it('should return 409 if insufficient wallet balance', async () => {
      mockGetReservation.mockResolvedValue({
        stationId: 'station-001',
        driverId: 'driver-001',
      });

      mockCompleteSwap.mockResolvedValue({
        success: false,
        error: 'Insufficient wallet balance',
        code: 'INSUFFICIENT_BALANCE',
      });

      const event = createEvent({
        httpMethod: 'PATCH',
        path: '/v1/operator/reservations/res-001/complete-swap',
        body: JSON.stringify({
          batteryReceivedId: 'bat-001',
          batteryReturnedId: 'bat-002',
          amount: 50000,
          paymentMethod: 'wallet',
        }),
      });

      const result = await handler(event);
      expect(result.statusCode).toBe(409);
    });
  });

  describe('POST /v1/swaps/{id}/rate', () => {
    it('should rate a swap successfully', async () => {
      mockRateSwap.mockResolvedValue({ success: true });

      const event = createEvent({
        httpMethod: 'POST',
        path: '/v1/swaps/tx-001/rate',
        body: JSON.stringify({ rating: 4 }),
      });

      const result = await handler(event);
      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.rating).toBe(4);
    });

    it('should reject non-integer rating', async () => {
      const event = createEvent({
        httpMethod: 'POST',
        path: '/v1/swaps/tx-001/rate',
        body: JSON.stringify({ rating: 3.5 }),
      });

      const result = await handler(event);
      expect(result.statusCode).toBe(400);
    });

    it('should reject rating below 1', async () => {
      const event = createEvent({
        httpMethod: 'POST',
        path: '/v1/swaps/tx-001/rate',
        body: JSON.stringify({ rating: 0 }),
      });

      const result = await handler(event);
      expect(result.statusCode).toBe(400);
    });

    it('should reject rating above 5', async () => {
      const event = createEvent({
        httpMethod: 'POST',
        path: '/v1/swaps/tx-001/rate',
        body: JSON.stringify({ rating: 6 }),
      });

      const result = await handler(event);
      expect(result.statusCode).toBe(400);
    });

    it('should return 404 if transaction not found', async () => {
      mockRateSwap.mockResolvedValue({
        success: false,
        error: 'Transaction not found',
        code: 'NOT_FOUND',
      });

      const event = createEvent({
        httpMethod: 'POST',
        path: '/v1/swaps/tx-999/rate',
        body: JSON.stringify({ rating: 5 }),
      });

      const result = await handler(event);
      expect(result.statusCode).toBe(404);
    });
  });

  describe('GET /v1/swaps/history', () => {
    it('should return paginated swap history', async () => {
      mockGetSwapHistory.mockResolvedValue({
        items: [
          {
            transactionId: 'tx-001',
            reservationId: 'res-001',
            stationId: 'station-001',
            driverId: 'user-123',
            batteryReceived: 'bat-001',
            batteryReturned: 'bat-002',
            amount: 500,
            paymentMethod: 'wallet',
            receiptId: 'receipt-001',
            timestamp: '2026-06-06T10:00:00Z',
          },
        ],
        nextToken: undefined,
      });

      const event = createEvent({
        httpMethod: 'GET',
        path: '/v1/swaps/history',
        queryStringParameters: { limit: '10' },
      });

      const result = await handler(event);
      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.items).toHaveLength(1);
      expect(body.count).toBe(1);
    });

    it('should pass date range filters', async () => {
      mockGetSwapHistory.mockResolvedValue({ items: [], nextToken: undefined });

      const event = createEvent({
        httpMethod: 'GET',
        path: '/v1/swaps/history',
        queryStringParameters: {
          startDate: '2026-06-01',
          endDate: '2026-06-06',
        },
      });

      const result = await handler(event);
      expect(result.statusCode).toBe(200);
      expect(mockGetSwapHistory).toHaveBeenCalledWith('user-123', {
        limit: 20,
        nextToken: undefined,
        startDate: '2026-06-01',
        endDate: '2026-06-06',
      });
    });

    it('should reject invalid limit', async () => {
      const event = createEvent({
        httpMethod: 'GET',
        path: '/v1/swaps/history',
        queryStringParameters: { limit: '200' },
      });

      const result = await handler(event);
      expect(result.statusCode).toBe(400);
    });
  });

  describe('Route not found', () => {
    it('should return 404 for unknown routes', async () => {
      const event = createEvent({
        httpMethod: 'GET',
        path: '/v1/unknown',
      });

      const result = await handler(event);
      expect(result.statusCode).toBe(404);
    });
  });
});
