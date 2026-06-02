'use client';

import React from 'react';

type StationStatus = 'available' | 'low' | 'empty';

interface StationMarkerProps {
  status: StationStatus;
  count: number;
  isSelected?: boolean;
  onClick?: () => void;
}

/**
 * Custom map marker component for stations.
 * Color-blind safe: uses distinct shapes + icons:
 * - Available: circle + check (green)
 * - Low: diamond + exclamation (amber)
 * - Empty: square + X (gray)
 */
export function StationMarker({ status, count, isSelected, onClick }: StationMarkerProps) {
  const config: Record<StationStatus, { bg: string; border: string; shape: string }> = {
    available: {
      bg: 'bg-success',
      border: 'border-success',
      shape: 'rounded-full',
    },
    low: {
      bg: 'bg-warning',
      border: 'border-warning',
      shape: 'rotate-45 rounded-sm',
    },
    empty: {
      bg: 'bg-gray-400 dark:bg-gray-600',
      border: 'border-gray-400 dark:border-gray-600',
      shape: 'rounded-sm',
    },
  };

  const { bg, border, shape } = config[status];

  return (
    <button
      onClick={onClick}
      className={`relative flex items-center justify-center min-w-[44px] min-h-[44px] focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${isSelected ? 'scale-125' : ''} transition-transform duration-normal`}
      aria-label={`Station: ${status}, ${count} batteries`}
    >
      {/* Marker shape */}
      <div className={`w-10 h-10 ${shape} ${bg} border-2 border-white dark:border-gray-900 shadow-elevated flex items-center justify-center ${status === 'low' ? '-rotate-45' : ''}`}>
        <span className={`text-white text-xs font-bold ${status === 'low' ? 'rotate-45' : ''}`}>
          {status === 'available' && <CheckIcon />}
          {status === 'low' && <ExclamationIcon />}
          {status === 'empty' && <XIcon />}
        </span>
      </div>

      {/* Count badge */}
      <span className={`absolute -top-1 -right-1 w-5 h-5 rounded-full ${bg} border border-white dark:border-gray-900 flex items-center justify-center text-[10px] font-bold text-white`}>
        {count}
      </span>

      {/* Selection ring */}
      {isSelected && (
        <div className={`absolute inset-0 ${shape} border-2 ${border} opacity-30 scale-150`} aria-hidden="true" />
      )}
    </button>
  );
}

function CheckIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M4 8l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ExclamationIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <line x1="8" y1="4" x2="8" y2="9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="8" cy="12" r="1" fill="currentColor" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M5 5l6 6M11 5l-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export default StationMarker;
