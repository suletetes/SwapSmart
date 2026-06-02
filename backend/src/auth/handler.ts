import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import {
  success,
  created,
  badRequest,
  unauthorized,
  notFound,
  conflict,
  tooManyRequests,
  internalError,
} from '../shared/response.js';
import {
  registerSchema,
  otpRequestSchema,
  otpVerifySchema,
  refreshSchema,
} from '../shared/validation.js';
import { storeOtp, verifyOtp } from './otp.service.js';
import {
  createAccount,
  phoneExists,
  issueTokens,
  refreshAccessToken,
  revokeSession,
} from './auth.service.js';

const snsClient = new SNSClient({
  region: process.env.AWS_REGION || 'af-south-1',
});

/**
 * Auth Lambda Handler
 * Routes requests to the appropriate auth operation based on path and method.
 */
export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const { httpMethod, path } = event;

  try {
    // Route matching
    if (httpMethod === 'POST' && path === '/v1/auth/register') {
      return handleRegister(event);
    }
    if (httpMethod === 'POST' && path === '/v1/auth/otp/request') {
      return handleOtpRequest(event);
    }
    if (httpMethod === 'POST' && path === '/v1/auth/otp/verify') {
      return handleOtpVerify(event);
    }
    if (httpMethod === 'POST' && path === '/v1/auth/refresh') {
      return handleRefresh(event);
    }
    if (httpMethod === 'POST' && path === '/v1/auth/logout') {
      return handleLogout(event);
    }

    // OPTIONS for CORS preflight
    if (httpMethod === 'OPTIONS') {
      return success({ message: 'OK' });
    }

    return notFound('Route not found');
  } catch (err) {
    console.error('Auth handler error:', err);
    return internalError();
  }
}

/**
 * POST /v1/auth/register
 * Create a new account with phone, name, role (and vehicleReg + kekeType for Drivers)
 */
async function handleRegister(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const body = parseBody(event.body);
  if (!body) {
    return badRequest('Request body is required');
  }

  const validation = registerSchema.safeParse(body);
  if (!validation.success) {
    const errors = validation.error.flatten().fieldErrors;
    return badRequest('Validation failed', errors);
  }

  const input = validation.data;

  // Create account
  const result = await createAccount(input);
  if (!result.success) {
    if (result.code === 'PHONE_EXISTS') {
      return conflict('Phone number is already registered');
    }
    return internalError(result.error);
  }

  // Generate and send OTP for the new account
  const otpResult = await storeOtp(input.phone);
  if (!otpResult.success) {
    return tooManyRequests(otpResult.retryAfter ?? 900);
  }

  // Send OTP via SMS
  await sendOtpSms(input.phone, otpResult.otp!);

  return created({
    message: 'Account created. OTP sent to your phone number.',
    userId: result.userId,
  });
}

/**
 * POST /v1/auth/otp/request
 * Request a new OTP for an existing phone number
 */
async function handleOtpRequest(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const body = parseBody(event.body);
  if (!body) {
    return badRequest('Request body is required');
  }

  const validation = otpRequestSchema.safeParse(body);
  if (!validation.success) {
    const errors = validation.error.flatten().fieldErrors;
    return badRequest('Validation failed', errors);
  }

  const { phone } = validation.data;

  // Check if phone is registered
  const exists = await phoneExists(phone);
  if (!exists) {
    return notFound('Phone number is not registered');
  }

  // Generate and store OTP
  const otpResult = await storeOtp(phone);
  if (!otpResult.success) {
    return tooManyRequests(otpResult.retryAfter ?? 900);
  }

  // Send OTP via SMS
  await sendOtpSms(phone, otpResult.otp!);

  return success({ message: 'OTP sent to your phone number' });
}

/**
 * POST /v1/auth/otp/verify
 * Verify OTP and issue JWT tokens
 */
async function handleOtpVerify(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const body = parseBody(event.body);
  if (!body) {
    return badRequest('Request body is required');
  }

  const validation = otpVerifySchema.safeParse(body);
  if (!validation.success) {
    const errors = validation.error.flatten().fieldErrors;
    return badRequest('Validation failed', errors);
  }

  const { phone, code } = validation.data;

  // Verify OTP
  const verifyResult = await verifyOtp(phone, code);

  if (!verifyResult.success) {
    if (verifyResult.retryAfter) {
      return tooManyRequests(verifyResult.retryAfter);
    }
    return unauthorized(verifyResult.error ?? 'Invalid OTP code');
  }

  // Issue Cognito tokens
  const tokenResult = await issueTokens(phone);
  if (!tokenResult.success) {
    return internalError(tokenResult.error);
  }

  return success({
    message: 'Authentication successful',
    accessToken: tokenResult.accessToken,
    refreshToken: tokenResult.refreshToken,
    idToken: tokenResult.idToken,
    expiresIn: tokenResult.expiresIn,
    user: tokenResult.user,
  });
}

/**
 * POST /v1/auth/refresh
 * Refresh access token using refresh token
 */
async function handleRefresh(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const body = parseBody(event.body);
  if (!body) {
    return badRequest('Request body is required');
  }

  const validation = refreshSchema.safeParse(body);
  if (!validation.success) {
    const errors = validation.error.flatten().fieldErrors;
    return badRequest('Validation failed', errors);
  }

  const { refreshToken } = validation.data;

  const result = await refreshAccessToken(refreshToken);
  if (!result.success) {
    return unauthorized(result.error ?? 'Token refresh failed');
  }

  return success({
    accessToken: result.accessToken,
    idToken: result.idToken,
    expiresIn: result.expiresIn,
  });
}

/**
 * POST /v1/auth/logout
 * Revoke session and invalidate tokens
 */
async function handleLogout(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  // Extract phone from the authorization context (set by API Gateway authorizer)
  const phone = event.requestContext?.authorizer?.claims?.phone_number
    || event.requestContext?.authorizer?.phone;

  if (!phone) {
    return unauthorized('Authentication required');
  }

  const result = await revokeSession(phone);
  if (!result.success) {
    return internalError(result.error);
  }

  return success({ message: 'Logged out successfully' });
}

/**
 * Send OTP via SNS SMS
 */
async function sendOtpSms(phone: string, otp: string): Promise<void> {
  try {
    await snsClient.send(
      new PublishCommand({
        PhoneNumber: phone,
        Message: `Your SwapSmart verification code is: ${otp}. Valid for 5 minutes. Do not share this code.`,
        MessageAttributes: {
          'AWS.SNS.SMS.SenderID': {
            DataType: 'String',
            StringValue: 'SwapSmart',
          },
          'AWS.SNS.SMS.SMSType': {
            DataType: 'String',
            StringValue: 'Transactional',
          },
        },
      })
    );
  } catch (err) {
    // Log but don't fail the request — OTP is stored in Redis regardless
    console.error('Failed to send OTP SMS:', err);
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
