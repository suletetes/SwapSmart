import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { APIGatewayProxyEvent } from 'aws-lambda';
import { handler } from './handler.js';

// Mock the wallet service
vi.mock('./wallet.service.js', () => ({
  getWalletBalance: vi.fn(),
  getLedgerEntries: vi.fn(),
  createPendingTopUp: vi.fn(),
  completeTopUp: vi.fn(),
}));

// Mock paystack
vi.mock('./paystack.js', () => ({
  initializeTransaction: vi.fn(),
  verifyWebhookSignature: vi.fn(),
}));

// Mock EventBridge
vi.mock('@aws-sdk/client-eventbridge', () => ({
  EventBridgeClient: vi.fn().mockImplementation(() => ({
    send: vi.fn().mockResolvedValue({}),
  })),
  PutEventsCommand: vi.fn(),
}));

import { getWalletBalance, getLedgerEntries, createPendingTopUp, completeTopUp } from './wallet.service.js';
import { initializeTransaction, verifyWebhookSignature } from './paystack.js';

const mockGetWalletBalance = vi.mocked(getWalletBalance);
const mockGetLedgerEntries = vi.mocked(getLedgerEntries);
const mockCreatePendingTopUp = vi.mocked(createPendingTopUp);
const mockCompleteTopUp = vi.mocked(completeTopUp);
const mockInitializeTransaction = vi.mocked(initializeTransaction);
const mockVerifyWebhookSignature = vi.mocked(verifyWebhookSignature);

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

describe('Wallet Handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /v1/wallet', () => {
    it('should return balance and recent transactions', async () => {
      mockGetWalletBalance.mockResolvedValue({
        userId: 'user-123',
        balance: 5000,
        updatedAt: '2026-06-06T10:00:00Z',
      });

      mockGetLedgerEntries.mockResolvedValue([
        {
          entryId: 'entry-001',
          type: 'CREDIT',
          amount: 5000,
          reference: 'ref-001',
          source: 'PAYSTACK_TOPUP',
          description: 'Wallet top-up ₦5,000',
          status: 'COMPLETED',
          timestamp: '2026-06-06T09:00:00Z',
        },
      ]);

      const event = createEvent({
        httpMethod: 'GET',
        path: '/v1/wallet',
      });

      const result = await handler(event);
      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.balance).toBe(5000);
      expect(body.transactions).toHaveLength(1);
    });

    it('should return 401 if not authenticated', async () => {
      const event = createEvent({
        httpMethod: 'GET',
        path: '/v1/wallet',
        requestContext: { authorizer: null } as any,
      });

      const result = await handler(event);
      expect(result.statusCode).toBe(401);
    });
  });

  describe('POST /v1/wallet/topup', () => {
    it('should initiate a top-up successfully', async () => {
      mockInitializeTransaction.mockResolvedValue({
        success: true,
        authorizationUrl: 'https://checkout.paystack.com/abc123',
        accessCode: 'abc123',
        reference: 'ref-paystack-001',
      });

      mockCreatePendingTopUp.mockResolvedValue({
        success: true,
        reference: 'ref-paystack-001',
      });

      const event = createEvent({
        httpMethod: 'POST',
        path: '/v1/wallet/topup',
        body: JSON.stringify({ amount: 2000 }),
      });

      const result = await handler(event);
      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.authorizationUrl).toBe('https://checkout.paystack.com/abc123');
      expect(body.reference).toBe('ref-paystack-001');

      // Verify amount was converted to kobo
      expect(mockInitializeTransaction).toHaveBeenCalledWith(
        expect.objectContaining({ amountKobo: 200000 })
      );
    });

    it('should reject amount below ₦100', async () => {
      const event = createEvent({
        httpMethod: 'POST',
        path: '/v1/wallet/topup',
        body: JSON.stringify({ amount: 50 }),
      });

      const result = await handler(event);
      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.error).toContain('₦100');
    });

    it('should reject amount above ₦500,000', async () => {
      const event = createEvent({
        httpMethod: 'POST',
        path: '/v1/wallet/topup',
        body: JSON.stringify({ amount: 600000 }),
      });

      const result = await handler(event);
      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.error).toContain('₦500,000');
    });

    it('should reject non-numeric amount', async () => {
      const event = createEvent({
        httpMethod: 'POST',
        path: '/v1/wallet/topup',
        body: JSON.stringify({ amount: 'abc' }),
      });

      const result = await handler(event);
      expect(result.statusCode).toBe(400);
    });

    it('should return 401 if not authenticated', async () => {
      const event = createEvent({
        httpMethod: 'POST',
        path: '/v1/wallet/topup',
        requestContext: { authorizer: null } as any,
        body: JSON.stringify({ amount: 1000 }),
      });

      const result = await handler(event);
      expect(result.statusCode).toBe(401);
    });
  });

  describe('POST /v1/wallet/topup/callback', () => {
    it('should process valid webhook successfully', async () => {
      mockVerifyWebhookSignature.mockReturnValue(true);
      mockCompleteTopUp.mockResolvedValue({ success: true, newBalance: 7000 });

      const webhookPayload = JSON.stringify({
        event: 'charge.success',
        data: {
          reference: 'ref-001',
          status: 'success',
          amount: 200000,
          metadata: { userId: 'user-123', amountNaira: 2000 },
        },
      });

      const event = createEvent({
        httpMethod: 'POST',
        path: '/v1/wallet/topup/callback',
        body: webhookPayload,
        headers: { 'x-paystack-signature': 'valid-signature' },
      });

      const result = await handler(event);
      expect(result.statusCode).toBe(200);
      expect(mockCompleteTopUp).toHaveBeenCalledWith('user-123', 'ref-001', 2000);
    });

    it('should reject invalid signature with 400', async () => {
      mockVerifyWebhookSignature.mockReturnValue(false);

      const event = createEvent({
        httpMethod: 'POST',
        path: '/v1/wallet/topup/callback',
        body: JSON.stringify({ event: 'charge.success', data: {} }),
        headers: { 'x-paystack-signature': 'invalid-signature' },
      });

      const result = await handler(event);
      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.error).toContain('Invalid signature');
    });

    it('should return 200 for already processed payments (idempotent)', async () => {
      mockVerifyWebhookSignature.mockReturnValue(true);
      mockCompleteTopUp.mockResolvedValue({ success: true, code: 'ALREADY_PROCESSED' });

      const webhookPayload = JSON.stringify({
        event: 'charge.success',
        data: {
          reference: 'ref-001',
          status: 'success',
          amount: 200000,
          metadata: { userId: 'user-123', amountNaira: 2000 },
        },
      });

      const event = createEvent({
        httpMethod: 'POST',
        path: '/v1/wallet/topup/callback',
        body: webhookPayload,
        headers: { 'x-paystack-signature': 'valid-signature' },
      });

      const result = await handler(event);
      expect(result.statusCode).toBe(200);
    });

    it('should acknowledge non-success events', async () => {
      mockVerifyWebhookSignature.mockReturnValue(true);

      const webhookPayload = JSON.stringify({
        event: 'charge.failed',
        data: {
          reference: 'ref-001',
          status: 'failed',
          amount: 200000,
          metadata: { userId: 'user-123', amountNaira: 2000 },
        },
      });

      const event = createEvent({
        httpMethod: 'POST',
        path: '/v1/wallet/topup/callback',
        body: webhookPayload,
        headers: { 'x-paystack-signature': 'valid-signature' },
      });

      const result = await handler(event);
      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.message).toBe('Event acknowledged');
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
