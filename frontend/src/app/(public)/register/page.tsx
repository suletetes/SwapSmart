'use client';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui';

type UserRole = 'Driver' | 'Operator' | 'FleetManager';

/**
 * Sign Up screen
 * - Full name, phone (+234), role dropdown (Driver/Operator/FleetManager)
 * - Conditional: vehicleReg + kekeType fields for Driver role
 * - "Create Account" green CTA, terms checkbox
 */
export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    role: '' as UserRole | '',
    vehicleReg: '',
    kekeType: '',
    termsAccepted: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const isDriver = formData.role === 'Driver';

  const handleChange = useCallback(
    (field: string, value: string | boolean) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
      setError('');
    },
    []
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError('');

      // Validation
      if (!formData.name || formData.name.length < 2) {
        setError('Name must be at least 2 characters');
        return;
      }

      const cleanPhone = formData.phone.replace(/\s/g, '');
      if (!/^\d{10}$/.test(cleanPhone)) {
        setError('Please enter a valid 10-digit phone number');
        return;
      }

      if (!formData.role) {
        setError('Please select a role');
        return;
      }

      if (isDriver && !formData.vehicleReg) {
        setError('Vehicle registration is required for drivers');
        return;
      }

      if (!formData.termsAccepted) {
        setError('You must accept the terms and conditions');
        return;
      }

      setIsLoading(true);
      try {
        const payload: Record<string, string> = {
          name: formData.name.trim(),
          phone: `+234${cleanPhone}`,
          role: formData.role,
        };

        if (isDriver) {
          payload.vehicleReg = formData.vehicleReg;
          if (formData.kekeType) payload.kekeType = formData.kekeType;
        }

        const response = await fetch('/api/v1/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          setError(data.message || 'Registration failed. Please try again.');
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
    [formData, isDriver, router]
  );

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center bg-background-light dark:bg-background-dark px-6 py-8">
      <div className="w-full max-w-sm">
        {/* Heading */}
        <h1 className="text-2xl font-heading font-bold text-text-primary-light dark:text-text-primary-dark text-center mb-2">
          Create your account
        </h1>
        <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark text-center mb-8">
          Join the SwapSmart network
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Full name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-text-primary-light dark:text-text-primary-dark mb-1.5">
              Full Name
            </label>
            <input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="Adamu Musa"
              className="w-full min-h-[44px] px-4 py-3 border border-border-light dark:border-border-dark rounded-button bg-surface-light dark:bg-surface-dark text-text-primary-light dark:text-text-primary-dark placeholder:text-text-secondary-light/50 dark:placeholder:text-text-secondary-dark/50 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-normal"
              autoComplete="name"
              maxLength={100}
            />
          </div>

          {/* Phone */}
          <div>
            <label htmlFor="reg-phone" className="block text-sm font-medium text-text-primary-light dark:text-text-primary-dark mb-1.5">
              Phone Number
            </label>
            <div className="flex">
              <span className="inline-flex items-center px-3 rounded-l-button border border-r-0 border-border-light dark:border-border-dark bg-gray-50 dark:bg-gray-800 text-sm text-text-secondary-light dark:text-text-secondary-dark">
                🇳🇬 +234
              </span>
              <input
                id="reg-phone"
                type="tel"
                inputMode="numeric"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value.replace(/[^\d\s]/g, ''))}
                placeholder="813 123 4567"
                className="flex-1 min-h-[44px] px-4 py-3 border border-border-light dark:border-border-dark rounded-r-button bg-surface-light dark:bg-surface-dark text-text-primary-light dark:text-text-primary-dark placeholder:text-text-secondary-light/50 dark:placeholder:text-text-secondary-dark/50 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-normal"
                autoComplete="tel"
                maxLength={13}
              />
            </div>
          </div>

          {/* Role selector */}
          <div>
            <label htmlFor="role" className="block text-sm font-medium text-text-primary-light dark:text-text-primary-dark mb-1.5">
              Role
            </label>
            <select
              id="role"
              value={formData.role}
              onChange={(e) => handleChange('role', e.target.value)}
              className="w-full min-h-[44px] px-4 py-3 border border-border-light dark:border-border-dark rounded-button bg-surface-light dark:bg-surface-dark text-text-primary-light dark:text-text-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-normal appearance-none"
            >
              <option value="">Select your role</option>
              <option value="Driver">Driver</option>
              <option value="Operator">Station Operator</option>
              <option value="FleetManager">Fleet Manager</option>
            </select>
          </div>

          {/* Conditional Driver fields */}
          {isDriver && (
            <>
              <div>
                <label htmlFor="vehicleReg" className="block text-sm font-medium text-text-primary-light dark:text-text-primary-dark mb-1.5">
                  Vehicle Registration
                </label>
                <input
                  id="vehicleReg"
                  type="text"
                  value={formData.vehicleReg}
                  onChange={(e) => handleChange('vehicleReg', e.target.value.toUpperCase())}
                  placeholder="LAG-234-XY"
                  className="w-full min-h-[44px] px-4 py-3 border border-border-light dark:border-border-dark rounded-button bg-surface-light dark:bg-surface-dark text-text-primary-light dark:text-text-primary-dark placeholder:text-text-secondary-light/50 dark:placeholder:text-text-secondary-dark/50 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-normal"
                />
              </div>

              <div>
                <label htmlFor="kekeType" className="block text-sm font-medium text-text-primary-light dark:text-text-primary-dark mb-1.5">
                  Keke Type
                </label>
                <select
                  id="kekeType"
                  value={formData.kekeType}
                  onChange={(e) => handleChange('kekeType', e.target.value)}
                  className="w-full min-h-[44px] px-4 py-3 border border-border-light dark:border-border-dark rounded-button bg-surface-light dark:bg-surface-dark text-text-primary-light dark:text-text-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-normal appearance-none"
                >
                  <option value="">Select keke type</option>
                  <option value="Electric">Electric</option>
                  <option value="Converting">Converting</option>
                </select>
              </div>
            </>
          )}

          {/* Terms checkbox */}
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.termsAccepted}
              onChange={(e) => handleChange('termsAccepted', e.target.checked)}
              className="mt-0.5 w-5 h-5 min-w-[20px] rounded border-border-light dark:border-border-dark text-primary focus:ring-primary focus:ring-2"
            />
            <span className="text-xs text-text-secondary-light dark:text-text-secondary-dark">
              I agree to the{' '}
              <span className="text-primary font-medium">Terms of Service</span> and{' '}
              <span className="text-primary font-medium">Privacy Policy</span>
            </span>
          </label>

          {/* Error */}
          {error && (
            <p className="text-xs text-error" role="alert">
              {error}
            </p>
          )}

          {/* Submit */}
          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            isLoading={isLoading}
          >
            Create Account
          </Button>
        </form>

        {/* Login link */}
        <p className="mt-6 text-center text-sm text-text-secondary-light dark:text-text-secondary-dark">
          Already have an account?{' '}
          <button
            onClick={() => router.push('/login')}
            className="text-primary font-medium hover:underline focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded"
          >
            Log in
          </button>
        </p>
      </div>
    </div>
  );
}
