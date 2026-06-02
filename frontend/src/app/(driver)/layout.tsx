'use client';

import React from 'react';

/**
 * Driver Layout — Responsive wrapper for all driver pages.
 *
 * Breakpoints:
 * - Mobile (375px): Full-width content, no sidebar. Bottom navigation for primary actions.
 * - Tablet (768px): Content with collapsible elements, slightly wider margins.
 * - Desktop (1440px): Centered content area (no persistent sidebar — driver uses
 *   bottom sheet + side nav drawer pattern).
 *
 * Ensures no horizontal scrolling at any breakpoint via overflow-x-hidden.
 */
export default function DriverLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh w-full overflow-x-hidden bg-background-light dark:bg-background-dark">
      {/* Main content area — responsive max-width and padding */}
      <main
        id="main-content"
        className="mx-auto w-full max-w-[1440px] px-4 sm:px-6 md:px-8 lg:px-12"
      >
        {children}
      </main>
    </div>
  );
}
