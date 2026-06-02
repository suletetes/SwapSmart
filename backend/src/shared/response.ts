import type { APIGatewayProxyResult } from 'aws-lambda';

export interface ApiError {
  error: string;
  code: string;
  details?: Record<string, unknown>;
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
  'Content-Type': 'application/json',
};

export function success(body: unknown, statusCode = 200): APIGatewayProxyResult {
  return {
    statusCode,
    headers: CORS_HEADERS,
    body: JSON.stringify(body),
  };
}

export function created(body: unknown): APIGatewayProxyResult {
  return success(body, 201);
}

export function error(
  statusCode: number,
  message: string,
  code: string,
  details?: Record<string, unknown>
): APIGatewayProxyResult {
  const errorBody: ApiError = { error: message, code, details };
  return {
    statusCode,
    headers: CORS_HEADERS,
    body: JSON.stringify(errorBody),
  };
}

export function badRequest(message: string, details?: Record<string, unknown>): APIGatewayProxyResult {
  return error(400, message, 'BAD_REQUEST', details);
}

export function unauthorized(message = 'Unauthorized'): APIGatewayProxyResult {
  return error(401, message, 'UNAUTHORIZED');
}

export function forbidden(message = 'Forbidden'): APIGatewayProxyResult {
  return error(403, message, 'FORBIDDEN');
}

export function notFound(message = 'Not found'): APIGatewayProxyResult {
  return error(404, message, 'NOT_FOUND');
}

export function conflict(message: string, details?: Record<string, unknown>): APIGatewayProxyResult {
  return error(409, message, 'CONFLICT', details);
}

export function tooManyRequests(retryAfter: number): APIGatewayProxyResult {
  return {
    statusCode: 429,
    headers: {
      ...CORS_HEADERS,
      'Retry-After': String(retryAfter),
    },
    body: JSON.stringify({
      error: 'Too many requests',
      code: 'RATE_LIMITED',
      details: { retryAfter },
    }),
  };
}

export function internalError(message = 'Internal server error'): APIGatewayProxyResult {
  return error(500, message, 'INTERNAL_ERROR');
}
