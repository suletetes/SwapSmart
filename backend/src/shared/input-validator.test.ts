import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import type { APIGatewayProxyEvent } from 'aws-lambda';
import { validateBody, validateQueryParams, validatePathParams, commonSchemas } from './input-validator.js';

function makeEvent(overrides: Partial<APIGatewayProxyEvent> = {}): APIGatewayProxyEvent {
  return {
    path: '/v1/test',
    resource: '/v1/test',
    httpMethod: 'POST',
    headers: {},
    multiValueHeaders: {},
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    pathParameters: null,
    stageVariables: null,
    body: null,
    isBase64Encoded: false,
    requestContext: {
      accountId: '123',
      apiId: 'api',
      authorizer: {},
      protocol: 'HTTP/1.1',
      httpMethod: 'POST',
      identity: {
        sourceIp: '127.0.0.1',
        accessKey: null,
        accountId: null,
        apiKey: null,
        apiKeyId: null,
        caller: null,
        clientCert: null,
        cognitoAuthenticationProvider: null,
        cognitoAuthenticationType: null,
        cognitoIdentityId: null,
        cognitoIdentityPoolId: null,
        principalOrgId: null,
        user: null,
        userAgent: null,
        userArn: null,
      },
      path: '/v1/test',
      stage: 'dev',
      requestId: 'req-123',
      requestTimeEpoch: Date.now(),
      resourceId: 'resource',
      resourcePath: '/v1/test',
    },
    ...overrides,
  } as APIGatewayProxyEvent;
}

describe('validateBody', () => {
  const testSchema = z.object({
    name: z.string().min(2),
    age: z.number().int().min(0),
  });

  it('validates a correct body', () => {
    const event = makeEvent({ body: JSON.stringify({ name: 'John', age: 25 }) });
    const result = validateBody(event, testSchema);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('John');
      expect(result.data.age).toBe(25);
    }
  });

  it('rejects invalid JSON', () => {
    const event = makeEvent({ body: 'not json{' });
    const result = validateBody(event, testSchema);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.statusCode).toBe(400);
      const body = JSON.parse(result.error.body);
      expect(body.code).toBe('BAD_REQUEST');
    }
  });

  it('rejects null body', () => {
    const event = makeEvent({ body: null });
    const result = validateBody(event, testSchema);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.statusCode).toBe(400);
    }
  });

  it('rejects body with missing required fields', () => {
    const event = makeEvent({ body: JSON.stringify({ name: 'John' }) });
    const result = validateBody(event, testSchema);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.statusCode).toBe(400);
      const body = JSON.parse(result.error.body);
      expect(body.details.errors).toBeDefined();
    }
  });

  it('rejects body with invalid field values', () => {
    const event = makeEvent({ body: JSON.stringify({ name: 'A', age: -1 }) });
    const result = validateBody(event, testSchema);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.statusCode).toBe(400);
    }
  });
});

describe('validateQueryParams', () => {
  const paginationSchema = z.object({
    limit: z.coerce.number().int().min(1).max(100).default(20),
    cursor: z.string().optional(),
  });

  it('validates correct query params', () => {
    const event = makeEvent({ queryStringParameters: { limit: '10' } });
    const result = validateQueryParams(event, paginationSchema);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(10);
    }
  });

  it('applies defaults for missing optional params', () => {
    const event = makeEvent({ queryStringParameters: {} });
    const result = validateQueryParams(event, paginationSchema);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(20);
    }
  });

  it('rejects invalid query params', () => {
    const event = makeEvent({ queryStringParameters: { limit: '999' } });
    const result = validateQueryParams(event, paginationSchema);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.statusCode).toBe(400);
    }
  });
});

describe('validatePathParams', () => {
  const pathSchema = z.object({
    id: z.string().uuid(),
  });

  it('validates correct path params', () => {
    const event = makeEvent({
      pathParameters: { id: '550e8400-e29b-41d4-a716-446655440000' },
    });
    const result = validatePathParams(event, pathSchema);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe('550e8400-e29b-41d4-a716-446655440000');
    }
  });

  it('rejects invalid UUID path param', () => {
    const event = makeEvent({ pathParameters: { id: 'not-a-uuid' } });
    const result = validatePathParams(event, pathSchema);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.statusCode).toBe(400);
    }
  });

  it('handles null path params', () => {
    const event = makeEvent({ pathParameters: null });
    const result = validatePathParams(event, pathSchema);
    expect(result.success).toBe(false);
  });
});

describe('commonSchemas', () => {
  it('validates UUID format', () => {
    expect(commonSchemas.uuid.safeParse('550e8400-e29b-41d4-a716-446655440000').success).toBe(true);
    expect(commonSchemas.uuid.safeParse('not-a-uuid').success).toBe(false);
  });

  it('validates rating range (1-5)', () => {
    expect(commonSchemas.rating.safeParse(1).success).toBe(true);
    expect(commonSchemas.rating.safeParse(5).success).toBe(true);
    expect(commonSchemas.rating.safeParse(0).success).toBe(false);
    expect(commonSchemas.rating.safeParse(6).success).toBe(false);
  });

  it('validates amount range (₦100 - ₦500,000)', () => {
    expect(commonSchemas.amount.safeParse(100).success).toBe(true);
    expect(commonSchemas.amount.safeParse(500000).success).toBe(true);
    expect(commonSchemas.amount.safeParse(99).success).toBe(false);
    expect(commonSchemas.amount.safeParse(500001).success).toBe(false);
  });
});
