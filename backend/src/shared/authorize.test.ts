import { describe, it, expect } from 'vitest';
import type { APIGatewayProxyEvent } from 'aws-lambda';
import { authorize, isPathPermittedForRole, isPublicPath, checkResourceOwnership } from './authorize.js';
import type { AuthContext } from './authorizer.js';

function makeEvent(overrides: Partial<APIGatewayProxyEvent> = {}): APIGatewayProxyEvent {
  return {
    path: '/v1/stations',
    resource: '/v1/stations',
    httpMethod: 'GET',
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
      httpMethod: 'GET',
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
      path: '/v1/stations',
      stage: 'dev',
      requestId: 'req-123',
      requestTimeEpoch: Date.now(),
      resourceId: 'resource',
      resourcePath: '/v1/stations',
    },
    ...overrides,
  } as APIGatewayProxyEvent;
}

describe('isPublicPath', () => {
  it('returns true for /v1/auth paths', () => {
    expect(isPublicPath('/v1/auth/register')).toBe(true);
    expect(isPublicPath('/v1/auth/otp/request')).toBe(true);
    expect(isPublicPath('/v1/auth/otp/verify')).toBe(true);
  });

  it('returns false for protected paths', () => {
    expect(isPublicPath('/v1/stations')).toBe(false);
    expect(isPublicPath('/v1/wallet')).toBe(false);
    expect(isPublicPath('/v1/operator/dashboard')).toBe(false);
    expect(isPublicPath('/v1/fleet/overview')).toBe(false);
  });
});

describe('isPathPermittedForRole', () => {
  it('allows Driver to access driver paths', () => {
    expect(isPathPermittedForRole('/v1/stations', 'Driver')).toBe(true);
    expect(isPathPermittedForRole('/v1/stations/station-001', 'Driver')).toBe(true);
    expect(isPathPermittedForRole('/v1/reservations', 'Driver')).toBe(true);
    expect(isPathPermittedForRole('/v1/wallet', 'Driver')).toBe(true);
    expect(isPathPermittedForRole('/v1/swaps/history', 'Driver')).toBe(true);
    expect(isPathPermittedForRole('/v1/profile', 'Driver')).toBe(true);
    expect(isPathPermittedForRole('/v1/predictions/swap-time', 'Driver')).toBe(true);
    expect(isPathPermittedForRole('/v1/ai/chat', 'Driver')).toBe(true);
    expect(isPathPermittedForRole('/v1/notifications', 'Driver')).toBe(true);
    expect(isPathPermittedForRole('/v1/favorites', 'Driver')).toBe(true);
  });

  it('denies Driver access to operator/fleet paths', () => {
    expect(isPathPermittedForRole('/v1/operator/dashboard', 'Driver')).toBe(false);
    expect(isPathPermittedForRole('/v1/fleet/overview', 'Driver')).toBe(false);
  });

  it('allows Operator to access operator paths', () => {
    expect(isPathPermittedForRole('/v1/operator/dashboard', 'Operator')).toBe(true);
    expect(isPathPermittedForRole('/v1/operator/inventory', 'Operator')).toBe(true);
    expect(isPathPermittedForRole('/v1/operator/reservations', 'Operator')).toBe(true);
  });

  it('denies Operator access to driver/fleet paths', () => {
    expect(isPathPermittedForRole('/v1/stations', 'Operator')).toBe(false);
    expect(isPathPermittedForRole('/v1/wallet', 'Operator')).toBe(false);
    expect(isPathPermittedForRole('/v1/fleet/overview', 'Operator')).toBe(false);
  });

  it('allows FleetManager to access fleet paths', () => {
    expect(isPathPermittedForRole('/v1/fleet/overview', 'FleetManager')).toBe(true);
    expect(isPathPermittedForRole('/v1/fleet/vehicles', 'FleetManager')).toBe(true);
    expect(isPathPermittedForRole('/v1/fleet/drivers', 'FleetManager')).toBe(true);
  });

  it('denies FleetManager access to driver/operator paths', () => {
    expect(isPathPermittedForRole('/v1/stations', 'FleetManager')).toBe(false);
    expect(isPathPermittedForRole('/v1/wallet', 'FleetManager')).toBe(false);
    expect(isPathPermittedForRole('/v1/operator/dashboard', 'FleetManager')).toBe(false);
  });
});

describe('authorize', () => {
  it('allows public paths without auth context', () => {
    const event = makeEvent({ path: '/v1/auth/register', resource: '/v1/auth/register' });
    const result = authorize(event);
    expect(result.error).toBeNull();
    expect(result.authContext).not.toBeNull();
  });

  it('returns 404 when no auth context on protected path', () => {
    const event = makeEvent({
      path: '/v1/stations',
      requestContext: {
        ...makeEvent().requestContext,
        authorizer: undefined,
      },
    });
    const result = authorize(event);
    expect(result.error).not.toBeNull();
    expect(result.error!.statusCode).toBe(404);
    expect(result.authContext).toBeNull();
  });

  it('returns 404 when role is not permitted for path', () => {
    const event = makeEvent({
      path: '/v1/operator/dashboard',
      requestContext: {
        ...makeEvent().requestContext,
        authorizer: {
          userId: 'user-123',
          role: 'Driver',
          phone: '+2348131234567',
          groups: '["Drivers"]',
        },
      },
    });
    const result = authorize(event);
    expect(result.error).not.toBeNull();
    expect(result.error!.statusCode).toBe(404);
    expect(result.authContext).toBeNull();
  });

  it('allows Driver to access stations', () => {
    const event = makeEvent({
      path: '/v1/stations',
      requestContext: {
        ...makeEvent().requestContext,
        authorizer: {
          userId: 'user-123',
          role: 'Driver',
          phone: '+2348131234567',
          groups: '["Drivers"]',
        },
      },
    });
    const result = authorize(event);
    expect(result.error).toBeNull();
    expect(result.authContext).not.toBeNull();
    expect(result.authContext!.role).toBe('Driver');
    expect(result.authContext!.userId).toBe('user-123');
  });

  it('allows Operator to access operator endpoints', () => {
    const event = makeEvent({
      path: '/v1/operator/dashboard',
      requestContext: {
        ...makeEvent().requestContext,
        authorizer: {
          userId: 'op-123',
          role: 'Operator',
          phone: '+2348131234567',
          groups: '["Operators"]',
        },
      },
    });
    const result = authorize(event);
    expect(result.error).toBeNull();
    expect(result.authContext!.role).toBe('Operator');
  });

  it('returns 404 (not 403) for cross-role access — indistinguishable from not-found', () => {
    const event = makeEvent({
      path: '/v1/fleet/overview',
      requestContext: {
        ...makeEvent().requestContext,
        authorizer: {
          userId: 'user-123',
          role: 'Driver',
          phone: '+2348131234567',
          groups: '["Drivers"]',
        },
      },
    });
    const result = authorize(event);
    expect(result.error).not.toBeNull();
    expect(result.error!.statusCode).toBe(404);
    // Verify the error body doesn't mention "forbidden" or "unauthorized"
    const body = JSON.parse(result.error!.body);
    expect(body.code).toBe('NOT_FOUND');
  });
});

describe('checkResourceOwnership', () => {
  const driverContext: AuthContext = {
    userId: 'driver-001',
    role: 'Driver',
    phone: '+2348131234567',
    groups: ['Drivers'],
  };

  const operatorContext: AuthContext = {
    userId: 'op-001',
    role: 'Operator',
    phone: '+2348131234567',
    groups: ['Operators'],
  };

  const fleetContext: AuthContext = {
    userId: 'fleet-001',
    role: 'FleetManager',
    phone: '+2348131234567',
    groups: ['FleetManagers'],
  };

  it('allows Driver to access their own wallet', () => {
    const event = makeEvent({ path: '/v1/wallet' });
    expect(checkResourceOwnership(event, driverContext)).toBe(true);
  });

  it('allows Driver to access their own reservations', () => {
    const event = makeEvent({ path: '/v1/reservations/active' });
    expect(checkResourceOwnership(event, driverContext)).toBe(true);
  });

  it('allows Operator to access operator endpoints', () => {
    const event = makeEvent({ path: '/v1/operator/dashboard' });
    expect(checkResourceOwnership(event, operatorContext)).toBe(true);
  });

  it('allows FleetManager to access fleet endpoints', () => {
    const event = makeEvent({ path: '/v1/fleet/overview' });
    expect(checkResourceOwnership(event, fleetContext)).toBe(true);
  });
});
