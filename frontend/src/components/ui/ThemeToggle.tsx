'use client';

import React from 'react';
import { useThemeStore } from '@/stores/theme.store';

/**
 * ThemeToggle — Reusable dark/light mode toggle with sun/moon icons.
 * - 44px minimum touch target for accessibility
 * - Smooth icon transition animation
 * - Persists to localStorage via theme store
 * - Defaults to OS preference on first visit
 */
export function ThemeToggle() {
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);

  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="relative inline-flex items-center justify-center min-h-[44px] min-w-[44px] w-11 h-11 rounded-full bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark transition-colors duration-normal hover:bg-gray-100 dark:hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background-light dark:focus-visible:ring-offset-background-dark"
    >
      {/* Sun icon (shown in dark mode — click to go light) */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`absolute w-5 h-5 transition-all duration-300 ${
          isDark
            ? 'opacity-100 rotate-0 scale-100'
            : 'opacity-0 rotate-90 scale-0'
        }`}
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="5" />
        <line x1="12" y1="1" x2="12" y2="3" />
        <line x1="12" y1="21" x2="12" y2="23" />
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
        <line x1="1" y1="12" x2="3" y2="12" />
        <line x1="21" y1="12" x2="23" y2="12" />
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
      </svg>

      {/* Moon icon (shown in light mode — click to go dark) */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`absolute w-5 h-5 transition-all duration-300 ${
          isDark
            ? 'opacity-0 -rotate-90 scale-0'
            : 'opacity-100 rotate-0 scale-100'
        }`}
        aria-hidden="true"
      >
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      </svg>
    </button>
  );
}
