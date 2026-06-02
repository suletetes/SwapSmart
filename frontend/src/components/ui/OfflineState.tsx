'use client';

import React from 'react';
import { useOfflineStore } from '@/stores/offline.store';

interface OfflineStateProps {
  /** Features available offline */
  availableFeatures?: string[];
  /** Features unavailable offline */
  unavailableFeatures?: string[];
  /** Additional CSS classes */
  className?: string;
}

export function OfflineState({
  availableFeatures = ['View cached stations', 'View active reservation', 'View map (cached tiles)'],
  unavailableFeatures = ['Create reservations', 'Top up wallet', 'Real-time availability'],
  className = '',
}: OfflineStateProps) {
  const reconnectCountdown = useOfflineStore((s) => s.reconnectCountdown);
  const lastSyncTime = useOfflineStore((s) => s.lastSyncTime);

  const timeSinceSync = lastSyncTime
    ? Math.round((Date.now() - lastSyncTime) / 1000)
    : null;

  return (
    <div
      className={`flex flex-col items-center justify-center px-6 py-12 text-center ${className}`}
      role="alert"
      aria-live="polite"
    >
      <div className="mb-4">
        <svg
          className="w-16 h-16 text-warning"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 011.06 0z"
          />
          <line x1="4" y1="4" x2="20" y2="20" strokeWidth={2} className="text-error" />
        </svg>
      </div>

      <h3 className="text-lg font-heading font-semibold text-text-primary-light dark:text-text-primary-dark mb-1">
        You&apos;re offline
      </h3>

      <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark max-w-xs mb-4">
        Some features are unavailable without an internet connection.
        {timeSinceSync !== null && (
          <span className="block mt-1 text-xs">
            Last synced {timeSinceSync < 60 ? `${timeSinceSync}s` : `${Math.round(timeSinceSync / 60)}m`} ago
          </span>
        )}
      </p>

      {/* Available features */}
      <div className="w-full max-w-xs mb-3">
        <h4 className="text-xs font-semibold text-success uppercase tracking-wide mb-2">
          Available
        </h4>
        <ul className="space-y-1">
          {availableFeatures.map((feature) => (
            <li key={feature} className="flex items-center gap-2 text-sm text-text-primary-light dark:text-text-primary-dark">
              <svg className="w-4 h-4 text-success flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              {feature}
            </li>
          ))}
        </ul>
      </div>

      {/* Unavailable features */}
      <div className="w-full max-w-xs mb-4">
        <h4 className="text-xs font-semibold text-error uppercase tracking-wide mb-2">
          Unavailable
        </h4>
        <ul className="space-y-1">
          {unavailableFeatures.map((feature) => (
            <li key={feature} className="flex items-center gap-2 text-sm text-text-secondary-light dark:text-text-secondary-dark">
              <svg className="w-4 h-4 text-error flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              {feature}
            </li>
          ))}
        </ul>
      </div>

      {/* Reconnection countdown */}
      {reconnectCountdown > 0 && (
        <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark" aria-live="polite">
          Reconnecting in {reconnectCountdown}s...
        </p>
      )}
    </div>
  );
}
