'use client';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui';

/**
 * Login screen
 * - SwapSmart logo (small), "Welcome back" heading
 * - Phone input with +234 prefix, "Send OTP" green button
 * - "or continue with" divider, Google sign-in button (outlined)
 * - "New here? Create account" link
 */
export default function LoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSendOTP = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError('');

      // Validate phone: 10 digits after +234
      const cleanPhone = phone.replace(/\s/g, '');
      if (!/^\d{10}$/.test(cleanPhone)) {
        setError('Please enter a valid 10-digit phone number');
        return;
      }

      setIsLoading(true);
      try {
        const response = await fetch('/api/v1/auth/otp/request', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: `+234${cleanPhone}` }),
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          if (response.status === 429) {
            setError('Too many attempts. Please try again later.');
          } else {
            setError(data.message || 'Failed to send OTP. Please try again.');
          }
          return;
        }

        // Navigate to OTP verification
        sessionStorage.setItem('swapsmart-otp-phone', `+234${cleanPhone}`);
        router.push('/verify-otp');
      } catch {
        setError('Network error. Please check your connection.');
      } finally {
        setIsLoading(false);
      }
    },
    [phone, router]
  );

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center bg-background-light dark:bg-background-dark px-6 py-8">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <SmallLogo />
        </div>

        {/* Heading */}
        <h1 className="text-2xl font-heading font-bold text-text-primary-light dark:text-text-primary-dark text-center mb-2">
          Welcome back
        </h1>
        <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark text-center mb-8">
          Enter your phone number to continue
        </p>

        {/* Form */}
        <form onSubmit={handleSendOTP} className="space-y-4">
          {/* Phone input */}
          <div>
            <label
              htmlFor="phone"
              className="block text-sm font-medium text-text-primary-light dark:text-text-primary-dark mb-1.5"
            >
              Phone Number
            </label>
            <div className="flex">
              <span className="inline-flex items-center px-3 rounded-l-button border border-r-0 border-border-light dark:border-border-dark bg-gray-50 dark:bg-gray-800 text-sm text-text-secondary-light dark:text-text-secondary-dark">
                🇳🇬 +234
              </span>
              <input
                id="phone"
                type="tel"
                inputMode="numeric"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/[^\d\s]/g, ''))}
                placeholder="813 123 4567"
                className="flex-1 min-h-[44px] px-4 py-3 border border-border-light dark:border-border-dark rounded-r-button bg-surface-light dark:bg-surface-dark text-text-primary-light dark:text-text-primary-dark placeholder:text-text-secondary-light/50 dark:placeholder:text-text-secondary-dark/50 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-normal"
                autoComplete="tel"
                maxLength={13}
              />
            </div>
            {error && (
              <p className="mt-1.5 text-xs text-error" role="alert">
                {error}
              </p>
            )}
          </div>

          {/* Send OTP button */}
          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            isLoading={isLoading}
          >
            Send OTP
          </Button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px bg-border-light dark:bg-border-dark" />
          <span className="text-xs text-text-secondary-light dark:text-text-secondary-dark">
            or continue with
          </span>
          <div className="flex-1 h-px bg-border-light dark:bg-border-dark" />
        </div>

        {/* Google sign-in */}
        <button
          type="button"
          className="w-full min-h-[44px] flex items-center justify-center gap-3 px-6 py-3 border-2 border-border-light dark:border-border-dark rounded-button text-text-primary-light dark:text-text-primary-dark font-medium hover:bg-gray-50 dark:hover:bg-gray-800 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 transition-colors duration-normal"
        >
          <GoogleIcon />
          <span>Continue with Google</span>
        </button>

        {/* Create account link */}
        <p className="mt-8 text-center text-sm text-text-secondary-light dark:text-text-secondary-dark">
          New here?{' '}
          <button
            onClick={() => router.push('/register')}
            className="text-primary font-medium hover:underline focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded"
          >
            Create account
          </button>
        </p>
      </div>
    </div>
  );
}

function SmallLogo() {
  return (
    <svg width="48" height="48" viewBox="0 0 120 120" fill="none" aria-label="SwapSmart" role="img">
      <rect x="30" y="35" width="50" height="55" rx="8" stroke="#10B981" strokeWidth="4" fill="none" />
      <rect x="45" y="25" width="20" height="10" rx="4" fill="#10B981" />
      <rect x="36" y="55" width="38" height="29" rx="4" fill="#10B981" opacity="0.2" />
      <path d="M55 45 L48 60 H56 L50 75" stroke="#10B981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}
