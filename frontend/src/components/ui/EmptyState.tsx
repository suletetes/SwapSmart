'use client';

import React from 'react';

interface EmptyStateProps {
  /** Main message to display */
  message: string;
  /** Optional description below the message */
  description?: string;
  /** Optional icon/illustration element */
  icon?: React.ReactNode;
  /** Optional CTA button label */
  actionLabel?: string;
  /** CTA button click handler */
  onAction?: () => void;
  /** Additional CSS classes */
  className?: string;
}

export function EmptyState({
  message,
  description,
  icon,
  actionLabel,
  onAction,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center px-6 py-12 text-center ${className}`}
      role="status"
    >
      {icon && (
        <div className="mb-4 text-text-secondary-light dark:text-text-secondary-dark">
          {icon}
        </div>
      )}

      {!icon && (
        <div className="mb-4">
          <svg
            className="w-16 h-16 text-text-secondary-light dark:text-text-secondary-dark opacity-50"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
            />
          </svg>
        </div>
      )}

      <h3 className="text-lg font-heading font-semibold text-text-primary-light dark:text-text-primary-dark mb-1">
        {message}
      </h3>

      {description && (
        <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark max-w-xs mb-4">
          {description}
        </p>
      )}

      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="min-h-[44px] min-w-[44px] px-6 py-3 bg-primary text-white font-medium rounded-button
            hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2
            transition-colors duration-normal"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
