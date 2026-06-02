import { getRedisClient } from '../shared/redis.js';

const OTP_TTL_SECONDS = 300; // 5 minutes
const ATTEMPTS_TTL_SECONDS = 900; // 15 minutes
const MAX_ATTEMPTS = 5;

export interface OtpResult {
  success: boolean;
  otp?: string;
  error?: string;
  retryAfter?: number;
}

export interface VerifyResult {
  success: boolean;
  error?: string;
  retryAfter?: number;
  attemptsRemaining?: number;
}

/**
 * Generate a 6-digit numeric OTP
 */
export function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

/**
 * Check if the phone is currently locked out due to too many failed attempts
 */
export async function isLockedOut(phone: string): Promise<{ locked: boolean; retryAfter: number }> {
  const redis = getRedisClient();
  const attemptsKey = `otp:${phone}:attempts`;

  const attempts = await redis.get(attemptsKey);
  if (attempts && parseInt(attempts, 10) >= MAX_ATTEMPTS) {
    const ttl = await redis.ttl(attemptsKey);
    return { locked: true, retryAfter: ttl > 0 ? ttl : ATTEMPTS_TTL_SECONDS };
  }

  return { locked: false, retryAfter: 0 };
}

/**
 * Store a new OTP for the given phone number.
 * Checks rate limiting before issuing.
 */
export async function storeOtp(phone: string): Promise<OtpResult> {
  const redis = getRedisClient();

  // Check if locked out
  const lockout = await isLockedOut(phone);
  if (lockout.locked) {
    return {
      success: false,
      error: 'Too many failed attempts. Please try again later.',
      retryAfter: lockout.retryAfter,
    };
  }

  const otp = generateOtp();
  const otpKey = `otp:${phone}`;

  // Store OTP with 300s TTL
  await redis.set(otpKey, otp, 'EX', OTP_TTL_SECONDS);

  return { success: true, otp };
}

/**
 * Verify an OTP code for the given phone number.
 * Tracks failed attempts and enforces lockout.
 */
export async function verifyOtp(phone: string, code: string): Promise<VerifyResult> {
  const redis = getRedisClient();
  const otpKey = `otp:${phone}`;
  const attemptsKey = `otp:${phone}:attempts`;

  // Check if locked out
  const lockout = await isLockedOut(phone);
  if (lockout.locked) {
    return {
      success: false,
      error: 'Account temporarily locked due to too many failed attempts',
      retryAfter: lockout.retryAfter,
    };
  }

  // Get stored OTP
  const storedOtp = await redis.get(otpKey);

  if (!storedOtp) {
    return {
      success: false,
      error: 'OTP has expired. Please request a new code.',
    };
  }

  if (storedOtp !== code) {
    // Increment failed attempts
    const newAttempts = await redis.incr(attemptsKey);
    // Set TTL on first attempt or refresh it
    if (newAttempts === 1) {
      await redis.expire(attemptsKey, ATTEMPTS_TTL_SECONDS);
    }

    const remaining = MAX_ATTEMPTS - newAttempts;

    if (remaining <= 0) {
      // Ensure the TTL is set for lockout period
      await redis.expire(attemptsKey, ATTEMPTS_TTL_SECONDS);
      const ttl = await redis.ttl(attemptsKey);
      return {
        success: false,
        error: 'Account temporarily locked due to too many failed attempts',
        retryAfter: ttl > 0 ? ttl : ATTEMPTS_TTL_SECONDS,
        attemptsRemaining: 0,
      };
    }

    return {
      success: false,
      error: 'Invalid OTP code',
      attemptsRemaining: remaining,
    };
  }

  // OTP matches — clean up
  await redis.del(otpKey);
  await redis.del(attemptsKey);

  return { success: true };
}
