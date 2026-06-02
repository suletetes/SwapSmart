'use client';

import React from 'react';

interface SkeletonLoaderProps {
  /** Width of the skeleton (CSS value) */
  width?: string;
  /** Height of the skeleton (CSS value) */
  height?: string;
  /** Shape variant */
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  /** Number of skeleton lines to render */
  lines?: number;
  /** Additional CSS classes */
  className?: string;
}

export function SkeletonLoader({
  width,
  height,
  variant = 'text',
  lines = 1,
  className = '',
}: SkeletonLoaderProps) {
  const baseClasses =
    'skeleton motion-safe:animate-shimmer bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 bg-[length:200%_100%]';

  const variantClasses: Record<string, string> = {
    text: 'h-4 rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-none',
    rounded: 'rounded-card',
  };

  const elements = Array.from({ length: lines }, (_, i) => (
    <div
      key={i}
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      style={{
        width: width || (variant === 'text' ? `${100 - i * 15}%` : width),
        height: height || (variant === 'circular' ? width : undefined),
      }}
      role="presentation"
      aria-hidden="true"
    />
  ));

  return (
    <div className="flex flex-col gap-2" aria-busy="true" aria-label="Loading content">
      {elements}
    </div>
  );
}

/** Pre-built skeleton for a card layout */
export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`p-4 rounded-card bg-surface-light dark:bg-surface-dark shadow-soft ${className}`}>
      <SkeletonLoader variant="rectangular" height="120px" className="mb-3 rounded-button" />
      <SkeletonLoader lines={2} className="mb-2" />
      <SkeletonLoader width="60%" />
    </div>
  );
}

/** Pre-built skeleton for a list item */
export function SkeletonListItem({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3 p-3 ${className}`}>
      <SkeletonLoader variant="circular" width="44px" height="44px" />
      <div className="flex-1">
        <SkeletonLoader width="70%" className="mb-1" />
        <SkeletonLoader width="40%" />
      </div>
    </div>
  );
}
