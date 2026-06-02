'use client';

import React from 'react';

/**
 * SkipToContent — Accessibility skip-navigation link.
 *
 * - Visually hidden by default, becomes visible on keyboard focus
 * - Jumps to the main content area (id="main-content")
 * - Meets WCAG 2.1 SC 2.4.1 (Bypass Blocks)
 * - High-contrast styling when visible for easy identification
 */
export function SkipToContent() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:inline-block focus:rounded-button focus:bg-primary focus:px-4 focus:py-3 focus:text-white focus:text-sm focus:font-medium focus:shadow-elevated focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-primary"
    >
      Skip to main content
    </a>
  );
}
