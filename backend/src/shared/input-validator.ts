import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { z, type ZodSchema } from 'zod';
import { badRequest } from './response.js';

/**
 * Validation result type.
 * Either contains the validated data or an error response.
 */
export type ValidationResult<T> =
  | { success: true; data: T; error: null }
  | { success: false; data: null; error: APIGatewayProxyResult };

/**
 * Validates the request body against a Zod schema.
 * Returns a 400 Bad Request with validation details if the input is malformed.
 *
 * Per Requirement 32.7: If a request contains malformed or invalid input,
 * the API_Layer SHALL reject the request with a validation error identifying
 * the failing input, SHALL not partially process it, and SHALL leave persisted
 * data unchanged.
 */
export function validateBody<T>(
  event: APIGatewayProxyEvent,
  schema: ZodSchema<T>
): ValidationResult<T> {
  // Parse body
  let body: unknown;
  try {
    body = event.body ? JSON.parse(event.body) : undefined;
  } catch {
    return {
      success: false,
      data: null,
      error: badRequest('Invalid JSON in request body', {
        field: 'body',
        reason: 'Malformed JSON',
      }),
    };
  }

  if (body === undefined || body === null) {
    return {
      success: false,
      data: null,
      error: badRequest('Request body is required'),
    };
  }

  // Validate against schema
  const result = schema.safeParse(body);

  if (!result.success) {
    const fieldErrors = result.error.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
      code: issue.code,
    }));

    return {
      success: false,
      data: null,
      error: badRequest('Validation failed', {
        errors: fieldErrors as unknown as Record<string, unknown>,
      }),
    };
  }

  return { success: true, data: result.data, error: null };
}

/**
 * Validates query string parameters against a Zod schema.
 * Returns a 400 Bad Request with validation details if the input is malformed.
 */
export function validateQueryParams<T>(
  event: APIGatewayProxyEvent,
  schema: ZodSchema<T>
): ValidationResult<T> {
  const params = event.queryStringParameters || {};

  const result = schema.safeParse(params);

  if (!result.success) {
    const fieldErrors = result.error.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
      code: issue.code,
    }));

    return {
      success: false,
      data: null,
      error: badRequest('Invalid query parameters', {
        errors: fieldErrors as unknown as Record<string, unknown>,
      }),
    };
  }

  return { success: true, data: result.data, error: null };
}

/**
 * Validates path parameters against a Zod schema.
 * Returns a 400 Bad Request with validation details if the input is malformed.
 */
export function validatePathParams<T>(
  event: APIGatewayProxyEvent,
  schema: ZodSchema<T>
): ValidationResult<T> {
  const params = event.pathParameters || {};

  const result = schema.safeParse(params);

  if (!result.success) {
    const fieldErrors = result.error.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
      code: issue.code,
    }));

    return {
      success: false,
      data: null,
      error: badRequest('Invalid path parameters', {
        errors: fieldErrors as unknown as Record<string, unknown>,
      }),
    };
  }

  return { success: true, data: result.data, error: null };
}

/**
 * Common reusable schemas for input validation.
 */
export const commonSchemas = {
  /** UUID v4 format */
  uuid: z.string().uuid('Must be a valid UUID'),

  /** Pagination parameters */
  pagination: z.object({
    limit: z.coerce.number().int().min(1).max(100).default(20),
    cursor: z.string().optional(),
  }),

  /** Date range parameters */
  dateRange: z.object({
    startDate: z.string().datetime({ message: 'Must be a valid ISO 8601 date' }),
    endDate: z.string().datetime({ message: 'Must be a valid ISO 8601 date' }),
  }),

  /** Latitude/Longitude */
  coordinates: z.object({
    lat: z.coerce.number().min(-90).max(90),
    lng: z.coerce.number().min(-180).max(180),
  }),

  /** Rating (1-5) */
  rating: z.coerce.number().int().min(1).max(5),

  /** Amount in Naira (₦100 - ₦500,000) */
  amount: z.coerce.number().min(100).max(500000),
};
