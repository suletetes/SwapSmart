'use client';

import React from 'react';

interface ErrorStateProps {
  /** Error message to display */
  message?: string;
  /** Optional detailed description */
  description?: string;
  /** Retry button click handler */
  onRetry?: () => void;
  /** Retry button label */
  retryLabel?: string;
  /** Additional CSS classes */
  className?: string;
}

export function ErrorState({
  message = 'Something went wrong',
  description = 'We couldn\'t load this content. Please try again.',
  onRetry,
  retryLabel = 'Try again',
  className = '',
}: ErrorStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center px-6 py-12 text-center ${className}`}
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
    >
      <div className="mb-4">
        <svg
          className="w-16 h-16 text-error"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
          />
        </svg>
      </div>

      <h3 className="text-lg font-heading font-semibold text-text-primary-light dark:text-text-primary-dark mb-1">
        {message}
      </h3>

      <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark max-w-xs mb-4">
        {description}
      </p>

      {onRetry && (
        <button
          onClick={onRetry}
          className="min-h-[44px] min-w-[44px] px-6 py-3 bg-primary text-white font-medium rounded-button
            hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2
            transition-colors duration-normal"
          aria-label={retryLabel}
        >
          {retryLabel}
        </button>
      )}
    </div>
  );
}
