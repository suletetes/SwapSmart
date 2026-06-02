'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useActiveReservation } from '@/hooks/useReservation';

/**
 * Swap In Progress screen — shows animation/indicator while swap is happening.
 * Redirects to receipt on completion.
 */
export default function SwapPage() {
  const router = useRouter();
  const { data: reservation } = useActiveReservation();

  // If swap is completed, redirect to receipt
  React.useEffect(() => {
    if (reservation?.state === 'Completed') {
      router.replace(`/receipt/${reservation.reservationId}`);
    }
  }, [reservation, router]);

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6 bg-background-light dark:bg-background-dark">
      {/* Swap animation */}
      <div className="relative mb-8" aria-label="Battery swap in progress">
        {/* Outer pulsing ring */}
        <div className="absolute inset-0 w-40 h-40 rounded-full bg-primary/10 motion-safe:animate-pulse" />
        
        {/* Inner circle with battery icon */}
        <div className="relative w-40 h-40 flex items-center justify-center rounded-full bg-primary/20 border-4 border-primary">
          {/* Battery swap icon */}
          <div className="relative">
            {/* Battery out (going up) */}
            <svg
              className="w-12 h-12 text-error motion-safe:animate-bounce"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
              style={{ animationDuration: '2s' }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
            </svg>
            {/* Battery in (going down) */}
            <svg
              className="w-12 h-12 text-success motion-safe:animate-bounce absolute top-0 left-12"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
              style={{ animationDuration: '2s', animationDelay: '1s' }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 13l-5 5m0 0l-5-5m5 5V6" />
            </svg>
          </div>
        </div>

        {/* Spinning progress ring */}
        <svg
          className="absolute inset-0 w-40 h-40 motion-safe:animate-spin"
          style={{ animationDuration: '3s' }}
          viewBox="0 0 160 160"
          aria-hidden="true"
        >
          <circle
            cx="80"
            cy="80"
            r="76"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeDasharray="100 380"
            className="text-primary"
          />
        </svg>
      </div>

      {/* Status text */}
      <h1 className="text-xl font-heading font-bold text-text-primary-light dark:text-text-primary-dark mb-2 text-center">
        Swap In Progress
      </h1>
      <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark text-center max-w-xs mb-6">
        The operator is swapping your battery. This usually takes 2-3 minutes.
      </p>

      {/* Progress steps */}
      <div className="w-full max-w-xs space-y-3" role="list" aria-label="Swap progress steps">
        <ProgressStep label="Battery removed" status="complete" />
        <ProgressStep label="New battery inserted" status="active" />
        <ProgressStep label="System check" status="pending" />
        <ProgressStep label="Swap complete" status="pending" />
      </div>

      {/* Station info */}
      {reservation && (
        <div className="mt-8 px-4 py-3 bg-surface-light dark:bg-surface-dark rounded-card border border-border-light dark:border-border-dark w-full max-w-xs">
          <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark">Station</p>
          <p className="text-sm font-semibold text-text-primary-light dark:text-text-primary-dark">
            {reservation.stationName}
          </p>
        </div>
      )}
    </div>
  );
}

interface ProgressStepProps {
  label: string;
  status: 'complete' | 'active' | 'pending';
}

function ProgressStep({ label, status }: ProgressStepProps) {
  return (
    <div className="flex items-center gap-3" role="listitem">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
        status === 'complete' ? 'bg-success text-white' :
        status === 'active' ? 'bg-primary/20 border-2 border-primary' :
        'bg-gray-100 dark:bg-gray-800 border-2 border-border-light dark:border-border-dark'
      }`}>
        {status === 'complete' && (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        )}
        {status === 'active' && (
          <div className="w-3 h-3 rounded-full bg-primary motion-safe:animate-pulse" />
        )}
      </div>
      <span className={`text-sm ${
        status === 'complete' ? 'text-success font-medium' :
        status === 'active' ? 'text-text-primary-light dark:text-text-primary-dark font-medium' :
        'text-text-secondary-light dark:text-text-secondary-dark'
      }`}>
        {label}
      </span>
    </div>
  );
}
