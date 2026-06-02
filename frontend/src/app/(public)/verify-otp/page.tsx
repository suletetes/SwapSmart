'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import { Button } from '@/components/ui';

type OTPState = 'idle' | 'loading' | 'error' | 'locked';

/**
 * OTP Verification screen
 * - 6 single-digit inputs with auto-focus advancement
 * - Resend countdown timer (60s), disabled while counting
 * - Error states: wrong code, expired, locked out (15min display)
 * - Loading state during verification
 */
export default function VerifyOTPPage() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const [otp, setOtp] = useState<string[]>(Array(6).fill(''));
  const [state, setState] = useState<OTPState>('idle');
  const [error, setError] = useState('');
  const [resendCountdown, setResendCountdown] = useState(60);
  const [lockoutRemaining, setLockoutRemaining] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const phone = typeof window !== 'undefined'
    ? sessionStorage.getItem('swapsmart-otp-phone') || ''
    : '';

  // Resend countdown timer
  useEffect(() => {
    if (resendCountdown <= 0) return;
    const timer = setInterval(() => {
      setResendCountdown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCountdown]);

  // Lockout countdown
  useEffect(() => {
    if (lockoutRemaining <= 0) return;
    const timer = setInterval(() => {
      setLockoutRemaining((prev) => {
        if (prev <= 1) {
          setState('idle');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [lockoutRemaining]);

  const handleInputChange = useCallback(
    (index: number, value: string) => {
      if (!/^\d*$/.test(value)) return;

      const newOtp = [...otp];
      newOtp[index] = value.slice(-1);
      setOtp(newOtp);
      setError('');

      // Auto-focus next input
      if (value && index < 5) {
        inputRefs.current[index + 1]?.focus();
      }

      // Auto-submit when all 6 digits entered
      if (value && index === 5 && newOtp.every((d) => d !== '')) {
        handleVerify(newOtp.join(''));
      }
    },
    [otp]
  );

  const handleKeyDown = useCallback(
    (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Backspace' && !otp[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    },
    [otp]
  );

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 0) return;

    const newOtp = [...otp];
    for (let i = 0; i < pasted.length && i < 6; i++) {
      newOtp[i] = pasted[i];
    }
    setOtp(newOtp);

    const nextEmpty = newOtp.findIndex((d) => d === '');
    const focusIndex = nextEmpty === -1 ? 5 : nextEmpty;
    inputRefs.current[focusIndex]?.focus();

    if (newOtp.every((d) => d !== '')) {
      handleVerify(newOtp.join(''));
    }
  }, [otp]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const handleVerify = useCallback(
    async (code?: string) => {
      const otpCode = code || otp.join('');
      if (otpCode.length !== 6) {
        setError('Please enter all 6 digits');
        return;
      }

      setState('loading');
      setError('');

      try {
        const response = await fetch('/api/v1/auth/otp/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone, code: otpCode }),
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));

          if (response.status === 429) {
            setState('locked');
            setLockoutRemaining(15 * 60);
            setError('Too many attempts. Account locked for 15 minutes.');
            return;
          }

          setState('error');
          if (data.error === 'expired') {
            setError('Code expired. Please request a new one.');
          } else {
            setError(data.message || 'Invalid code. Please try again.');
          }
          setOtp(Array(6).fill(''));
          inputRefs.current[0]?.focus();
          return;
        }

        const data = await response.json();
        login(
          {
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
            idToken: data.idToken,
            expiresAt: Date.now() + (data.expiresIn || 3600) * 1000,
          },
          data.user
        );

        // Route based on role
        const role = data.user?.role;
        if (role === 'Operator') {
          router.push('/operator');
        } else if (role === 'FleetManager') {
          router.push('/fleet');
        } else {
          router.push('/driver');
        }
      } catch {
        setState('error');
        setError('Network error. Please check your connection.');
      }
    },
    [otp, phone, login, router]
  );

  const handleResend = useCallback(async () => {
    if (resendCountdown > 0) return;

    try {
      await fetch('/api/v1/auth/otp/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      setResendCountdown(60);
      setOtp(Array(6).fill(''));
      setError('');
      setState('idle');
      inputRefs.current[0]?.focus();
    } catch {
      setError('Failed to resend code.');
    }
  }, [resendCountdown, phone]);

  const maskedPhone = phone
    ? phone.replace(/(\+234)\d{3}(\d{3})(\d{2})(\d{2})/, '$1 8** *** **$4')
    : '';

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center bg-background-light dark:bg-background-dark px-6 py-8">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-heading font-bold text-text-primary-light dark:text-text-primary-dark text-center mb-2">
          Enter verification code
        </h1>
        <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark text-center mb-8">
          We sent a 6-digit code to {maskedPhone}
        </p>

        {/* OTP Inputs */}
        <div className="flex justify-center gap-2 mb-6" onPaste={handlePaste}>
          {otp.map((digit, index) => (
            <input
              key={index}
              ref={(el) => { inputRefs.current[index] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleInputChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              disabled={state === 'loading' || state === 'locked'}
              className={`w-12 h-14 text-center text-xl font-bold rounded-button border-2 transition-all duration-normal focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-surface-light dark:bg-surface-dark text-text-primary-light dark:text-text-primary-dark disabled:opacity-50 ${
                error
                  ? 'border-error'
                  : 'border-border-light dark:border-border-dark'
              }`}
              aria-label={`Digit ${index + 1}`}
            />
          ))}
        </div>

        {/* Error message */}
        {error && (
          <p className="text-xs text-error text-center mb-4" role="alert">
            {error}
          </p>
        )}

        {/* Lockout display */}
        {state === 'locked' && lockoutRemaining > 0 && (
          <p className="text-sm text-warning text-center mb-4" aria-live="polite">
            Try again in {formatTime(lockoutRemaining)}
          </p>
        )}

        {/* Verify button */}
        <Button
          variant="primary"
          size="lg"
          fullWidth
          onClick={() => handleVerify()}
          isLoading={state === 'loading'}
          disabled={state === 'locked' || otp.some((d) => d === '')}
        >
          Verify
        </Button>

        {/* Resend */}
        <div className="mt-6 text-center">
          {resendCountdown > 0 ? (
            <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
              Resend code in{' '}
              <span className="font-medium">{formatTime(resendCountdown)}</span>
            </p>
          ) : (
            <button
              onClick={handleResend}
              disabled={state === 'locked'}
              className="text-sm font-medium text-primary hover:underline focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] min-w-[44px] px-4 py-2"
            >
              Resend code
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
