'use client';

import React from 'react';

type StatusType = 'available' | 'low' | 'empty';

interface StatusBadgeProps {
  /** Status type determines color and shape */
  status: StatusType;
  /** Optional label text */
  label?: string;
  /** Optional count to display */
  count?: number;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Color-blind safe status badge using distinct shapes + icons:
 * - Available: circle + check (green)
 * - Low: diamond + exclamation (amber)
 * - Empty: square + X (gray)
 */
export function StatusBadge({ status, label, count, className = '' }: StatusBadgeProps) {
  const config: Record<StatusType, { bg: string; text: string; ariaLabel: string }> = {
    available: {
      bg: 'bg-success/10 dark:bg-success/20',
      text: 'text-success',
      ariaLabel: label || 'Available',
    },
    low: {
      bg: 'bg-warning/10 dark:bg-warning/20',
      text: 'text-warning',
      ariaLabel: label || 'Low stock',
    },
    empty: {
      bg: 'bg-gray-200 dark:bg-gray-700',
      text: 'text-gray-500 dark:text-gray-400',
      ariaLabel: label || 'Empty',
    },
  };

  const { bg, text, ariaLabel } = config[status];

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${bg} ${text} ${className}`}
      role="status"
      aria-label={`${ariaLabel}${count !== undefined ? `: ${count}` : ''}`}
    >
      <StatusIcon status={status} />
      {label && <span>{label}</span>}
      {count !== undefined && <span className="font-bold">{count}</span>}
    </span>
  );
}

function StatusIcon({ status }: { status: StatusType }) {
  switch (status) {
    case 'available':
      // Circle with check
      return (
        <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
          <path d="M5 8l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'low':
      // Diamond with exclamation
      return (
        <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <rect x="8" y="1" width="9.9" height="9.9" rx="1" transform="rotate(45 8 1)" stroke="currentColor" strokeWidth="1.5" />
          <line x1="8" y1="5.5" x2="8" y2="8.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="8" cy="10.5" r="0.75" fill="currentColor" />
        </svg>
      );
    case 'empty':
      // Square with X
      return (
        <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
          <path d="M5.5 5.5l5 5M10.5 5.5l-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      );
  }
}
