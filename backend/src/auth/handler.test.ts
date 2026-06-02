import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { APIGatewayProxyEvent } from 'aws-lambda';

// Mock external dependencies
vi.mock('../shared/redis.js', () => ({
  getRedisClient: vi.fn(() => ({
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
    incr: vi.fn(),
    expire: vi.fn(),
    ttl: vi.fn(),
  })),
}));

vi.mock('@aws-sdk/client-sns', () => ({
  SNSClient: vi.fn(() => ({ send: vi.fn() })),
  PublishCommand: vi.fn(),
}));

vi.mock('@aws-sdk/client-cognito-identity-provider', () => ({
  CognitoIdentityProviderClient: vi.fn(() => ({ send: vi.fn() })),
  AdminCreateUserCommand: vi.fn(),
  AdminAddUserToGroupCommand: vi.fn(),
  AdminInitiateAuthCommand: vi.fn(),
  AdminGetUserCommand: vi.fn(),
  AdminUserGlobalSignOutCommand: vi.fn(),
  AuthFlowType: { CUSTOM_AUTH: 'CUSTOM_AUTH', REFRESH_TOKEN_AUTH: 'REFRESH_TOKEN_AUTH' },
  UsernameExistsException: class UsernameExistsException extends Error {},
}));

vi.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: vi.fn(() => ({})),
}));

vi.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: { from: vi.fn(() => ({ send: vi.fn() })) },
  PutCommand: vi.fn(),
  QueryCommand: vi.fn(),
}));

vi.mock('./otp.service.js', () => ({
  storeOtp: vi.fn(),
  verifyOtp: vi.fn(),
}));

vi.mock('./auth.service.js', () => ({
  createAccount: vi.fn(),
  phoneExists: vi.fn(),
  issueTokens: vi.fn(),
  refreshAccessToken: vi.fn(),
  revokeSession: vi.fn(),
}));

import { handler } from './handler.js';
import { storeOtp, verifyOtp } from './otp.service.js';
import { createAccount, phoneExists, issueTokens, refreshAccessToken, revokeSession } from './auth.service.js';

function makeEvent(overrides: Partial<APIGatewayProxyEvent> = {}): APIGatewayProxyEvent {
  return {
    httpMethod: 'POST',
    path: '/v1/auth/register',
    body: null,
    headers: {},
    multiValueHeaders: {},
    isBase64Encoded: false,
    pathParameters: null,
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    stageVariables: null,
    requestContext: {} as APIGatewayProxyEvent['requestContext'],
    resource: '',
    ...overrides,
  };
}

describe('Auth Handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /v1/auth/register', () => {
    it('returns 400 when body is missing', async () => {
      const event = makeEvent({ path: '/v1/auth/register', body: null });
      const result = await handler(event);
      expect(result.statusCode).toBe(400);
    });

    it('returns 400 when phone format is invalid', async () => {
      const event = makeEvent({
        path: '/v1/auth/register',
        body: JSON.stringify({
          phone: '08131234567', // missing +234 prefix
          name: 'John Doe',
          role: 'Driver',
          vehicleReg: 'ABC123',
          kekeType: 'Bajaj',
        }),
      });
      const result = await handler(event);
      expect(result.statusCode).toBe(400);
      const body = JSON.parse(result.body);
      expect(body.code).toBe('BAD_REQUEST');
    });

    it('returns 400 when name is too short', async () => {
      const event = makeEvent({
        path: '/v1/auth/register',
        body: JSON.stringify({
          phone: '+2348131234567',
          name: 'J', // too short
          role: 'Driver',
          vehicleReg: 'ABC123',
          kekeType: 'Bajaj',
        }),
      });
      const result = await handler(event);
      expect(result.statusCode).toBe(400);
    });

    it('returns 400 when Driver role is missing vehicleReg', async () => {
      const event = makeEvent({
        path: '/v1/auth/register',
        body: JSON.stringify({
          phone: '+2348131234567',
          name: 'John Doe',
          role: 'Driver',
          // missing vehicleReg and kekeType
        }),
      });
      const result = await handler(event);
      expect(result.statusCode).toBe(400);
    });

    it('returns 409 when phone already exists', async () => {
      vi.mocked(createAccount).mockResolvedValue({
        success: false,
        error: 'Phone number is already registered',
        code: 'PHONE_EXISTS',
      });

      const event = makeEvent({
        path: '/v1/auth/register',
        body: JSON.stringify({
          phone: '+2348131234567',
          name: 'John Doe',
          role: 'Operator',
        }),
      });
      const result = await handler(event);
      expect(result.statusCode).toBe(409);
    });

    it('returns 201 on successful registration', async () => {
      vi.mocked(createAccount).mockResolvedValue({
        success: true,
        userId: 'test-user-id',
      });
      vi.mocked(storeOtp).mockResolvedValue({
        success: true,
        otp: '123456',
      });

      const event = makeEvent({
        path: '/v1/auth/register',
        body: JSON.stringify({
          phone: '+2348131234567',
          name: 'John Doe',
          role: 'Operator',
        }),
      });
      const result = await handler(event);
      expect(result.statusCode).toBe(201);
      const body = JSON.parse(result.body);
      expect(body.userId).toBe('test-user-id');
    });
  });

  describe('POST /v1/auth/otp/request', () => {
    it('returns 400 when phone is invalid', async () => {
      const event = makeEvent({
        path: '/v1/auth/otp/request',
        body: JSON.stringify({ phone: 'invalid' }),
      });
      const result = await handler(event);
      expect(result.statusCode).toBe(400);
    });

    it('returns 404 when phone is not registered', async () => {
      vi.mocked(phoneExists).mockResolvedValue(false);

      const event = makeEvent({
        path: '/v1/auth/otp/request',
        body: JSON.stringify({ phone: '+2348131234567' }),
      });
      const result = await handler(event);
      expect(result.statusCode).toBe(404);
    });

    it('returns 429 when rate limited', async () => {
      vi.mocked(phoneExists).mockResolvedValue(true);
      vi.mocked(storeOtp).mockResolvedValue({
        success: false,
        error: 'Too many failed attempts',
        retryAfter: 600,
      });

      const event = makeEvent({
        path: '/v1/auth/otp/request',
        body: JSON.stringify({ phone: '+2348131234567' }),
      });
      const result = await handler(event);
      expect(result.statusCode).toBe(429);
    });

    it('returns 200 on successful OTP request', async () => {
      vi.mocked(phoneExists).mockResolvedValue(true);
      vi.mocked(storeOtp).mockResolvedValue({
        success: true,
        otp: '654321',
      });

      const event = makeEvent({
        path: '/v1/auth/otp/request',
        body: JSON.stringify({ phone: '+2348131234567' }),
      });
      const result = await handler(event);
      expect(result.statusCode).toBe(200);
    });
  });

  describe('POST /v1/auth/otp/verify', () => {
    it('returns 400 when OTP format is invalid', async () => {
      const event = makeEvent({
        path: '/v1/auth/otp/verify',
        body: JSON.stringify({ phone: '+2348131234567', code: '12345' }), // 5 digits
      });
      const result = await handler(event);
      expect(result.statusCode).toBe(400);
    });

    it('returns 401 when OTP is incorrect', async () => {
      vi.mocked(verifyOtp).mockResolvedValue({
        success: false,
        error: 'Invalid OTP code',
        attemptsRemaining: 3,
      });

      const event = makeEvent({
        path: '/v1/auth/otp/verify',
        body: JSON.stringify({ phone: '+2348131234567', code: '000000' }),
      });
      const result = await handler(event);
      expect(result.statusCode).toBe(401);
    });

    it('returns 429 when locked out', async () => {
      vi.mocked(verifyOtp).mockResolvedValue({
        success: false,
        error: 'Account temporarily locked',
        retryAfter: 900,
      });

      const event = makeEvent({
        path: '/v1/auth/otp/verify',
        body: JSON.stringify({ phone: '+2348131234567', code: '123456' }),
      });
      const result = await handler(event);
      expect(result.statusCode).toBe(429);
    });

    it('returns 200 with tokens on successful verification', async () => {
      vi.mocked(verifyOtp).mockResolvedValue({ success: true });
      vi.mocked(issueTokens).mockResolvedValue({
        success: true,
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        idToken: 'id-token',
        expiresIn: 3600,
        user: {
          userId: 'user-1',
          name: 'John Doe',
          phone: '+2348131234567',
          role: 'Driver',
          memberSince: '2026-06-06T00:00:00Z',
        },
      });

      const event = makeEvent({
        path: '/v1/auth/otp/verify',
        body: JSON.stringify({ phone: '+2348131234567', code: '123456' }),
      });
      const result = await handler(event);
      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.accessToken).toBe('access-token');
      expect(body.user.role).toBe('Driver');
    });
  });

  describe('POST /v1/auth/refresh', () => {
    it('returns 400 when refreshToken is missing', async () => {
      const event = makeEvent({
        path: '/v1/auth/refresh',
        body: JSON.stringify({}),
      });
      const result = await handler(event);
      expect(result.statusCode).toBe(400);
    });

    it('returns 200 with new tokens on success', async () => {
      vi.mocked(refreshAccessToken).mockResolvedValue({
        success: true,
        accessToken: 'new-access-token',
        idToken: 'new-id-token',
        expiresIn: 3600,
      });

      const event = makeEvent({
        path: '/v1/auth/refresh',
        body: JSON.stringify({ refreshToken: 'valid-refresh-token' }),
      });
      const result = await handler(event);
      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.accessToken).toBe('new-access-token');
    });
  });

  describe('POST /v1/auth/logout', () => {
    it('returns 401 when no auth context', async () => {
      const event = makeEvent({
        path: '/v1/auth/logout',
        body: null,
      });
      const result = await handler(event);
      expect(result.statusCode).toBe(401);
    });

    it('returns 200 on successful logout', async () => {
      vi.mocked(revokeSession).mockResolvedValue({ success: true });

      const event = makeEvent({
        path: '/v1/auth/logout',
        body: null,
        requestContext: {
          authorizer: {
            claims: { phone_number: '+2348131234567' },
          },
        } as unknown as APIGatewayProxyEvent['requestContext'],
      });
      const result = await handler(event);
      expect(result.statusCode).toBe(200);
    });
  });

  describe('Route matching', () => {
    it('returns 404 for unknown routes', async () => {
      const event = makeEvent({
        path: '/v1/auth/unknown',
        httpMethod: 'POST',
      });
      const result = await handler(event);
      expect(result.statusCode).toBe(404);
    });

    it('returns 200 for OPTIONS (CORS preflight)', async () => {
      const event = makeEvent({
        path: '/v1/auth/register',
        httpMethod: 'OPTIONS',
      });
      const result = await handler(event);
      expect(result.statusCode).toBe(200);
    });
  });
});
