'use client';

import React, { useState, useEffect } from 'react';

interface ReservationCountdownProps {
  /** ISO 8601 expiry timestamp */
  expiresAt: string;
  /** Called when countdown reaches zero */
  onExpired?: () => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Countdown timer component that updates every second.
 * Displays remaining time until reservation expires.
 */
export function ReservationCountdown({
  expiresAt,
  onExpired,
  className = '',
}: ReservationCountdownProps) {
  const [remaining, setRemaining] = useState(() => calculateRemaining(expiresAt));

  useEffect(() => {
    const timer = setInterval(() => {
      const newRemaining = calculateRemaining(expiresAt);
      setRemaining(newRemaining);

      if (newRemaining.total <= 0) {
        clearInterval(timer);
        onExpired?.();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [expiresAt, onExpired]);

  const isUrgent = remaining.total <= 120; // Less than 2 minutes
  const isExpired = remaining.total <= 0;

  if (isExpired) {
    return (
      <div className={`text-center ${className}`} role="timer" aria-live="assertive">
        <p className="text-sm font-medium text-error">Reservation expired</p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center ${className}`} role="timer" aria-live="polite" aria-atomic="true">
      {/* Circular progress */}
      <div className="relative w-20 h-20 mb-2">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80" aria-hidden="true">
          <circle
            cx="40"
            cy="40"
            r="35"
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            className="text-gray-200 dark:text-gray-700"
          />
          <circle
            cx="40"
            cy="40"
            r="35"
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            strokeDasharray={`${2 * Math.PI * 35}`}
            strokeDashoffset={`${2 * Math.PI * 35 * (1 - remaining.total / (15 * 60))}`}
            strokeLinecap="round"
            className={isUrgent ? 'text-error' : 'text-primary'}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-lg font-bold ${isUrgent ? 'text-error' : 'text-text-primary-light dark:text-text-primary-dark'}`}>
            {remaining.minutes}:{remaining.seconds.toString().padStart(2, '0')}
          </span>
        </div>
      </div>

      <p className={`text-xs ${isUrgent ? 'text-error' : 'text-text-secondary-light dark:text-text-secondary-dark'}`}>
        {isUrgent ? 'Hurry! Reservation expiring soon' : 'Reservation holds for 15 minutes'}
      </p>
    </div>
  );
}

function calculateRemaining(expiresAt: string) {
  const diff = Math.max(0, new Date(expiresAt).getTime() - Date.now());
  const total = Math.floor(diff / 1000);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return { total, minutes, seconds };
}

export default ReservationCountdown;
