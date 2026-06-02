'use client';

import React, { useEffect, useRef, useCallback } from 'react';

interface ModalSheetProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Close handler */
  onClose: () => void;
  /** Modal title */
  title?: string;
  /** Content */
  children: React.ReactNode;
  /** Additional CSS classes for the content container */
  className?: string;
}

/**
 * Responsive modal component:
 * - Mobile: bottom sheet with rounded top corners
 * - Desktop: centered modal
 * Includes focus trap, keyboard dismissible (Escape), and overlay click to close.
 */
export function ModalSheet({ isOpen, onClose, title, children, className = '' }: ModalSheetProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Focus trap
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }

      if (e.key === 'Tab' && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstEl = focusableElements[0];
        const lastEl = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstEl) {
            e.preventDefault();
            lastEl?.focus();
          }
        } else {
          if (document.activeElement === lastEl) {
            e.preventDefault();
            firstEl?.focus();
          }
        }
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';

      // Focus the modal
      setTimeout(() => {
        const firstFocusable = modalRef.current?.querySelector<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        firstFocusable?.focus();
      }, 100);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
      previousFocusRef.current?.focus();
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-modal flex items-end md:items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
    >
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50 motion-safe:animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Content */}
      <div
        ref={modalRef}
        className={`
          relative z-10 w-full bg-surface-light dark:bg-surface-dark
          motion-safe:animate-slide-up
          
          /* Mobile: bottom sheet */
          max-h-[85vh] rounded-t-bottom-sheet
          
          /* Desktop: centered modal */
          md:max-w-lg md:rounded-card md:mx-4 md:max-h-[80vh]
          
          overflow-y-auto shadow-elevated
          ${className}
        `}
      >
        {/* Handle bar (mobile) */}
        <div className="flex justify-center pt-3 pb-1 md:hidden">
          <div className="w-10 h-1 rounded-full bg-border-light dark:bg-border-dark" />
        </div>

        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-border-light dark:border-border-dark">
            <h2
              id="modal-title"
              className="text-lg font-heading font-semibold text-text-primary-light dark:text-text-primary-dark"
            >
              {title}
            </h2>
            <button
              onClick={onClose}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full
                hover:bg-gray-100 dark:hover:bg-gray-800
                focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Body */}
        <div className="px-6 py-4">{children}</div>
      </div>
    </div>
  );
}
