'use client';

import React, { useEffect, useState, useCallback } from 'react';

type ToastVariant = 'success' | 'error' | 'warning';

interface ToastProps {
  /** Toast variant */
  variant: ToastVariant;
  /** Message to display */
  message: string;
  /** Auto-dismiss duration in ms (0 to disable) */
  duration?: number;
  /** Close handler */
  onClose: () => void;
  /** Whether the toast is visible */
  isVisible: boolean;
}

const variantConfig: Record<ToastVariant, { bg: string; icon: string; border: string }> = {
  success: {
    bg: 'bg-success/10 dark:bg-success/20',
    icon: 'text-success',
    border: 'border-l-4 border-success',
  },
  error: {
    bg: 'bg-error/10 dark:bg-error/20',
    icon: 'text-error',
    border: 'border-l-4 border-error',
  },
  warning: {
    bg: 'bg-warning/10 dark:bg-warning/20',
    icon: 'text-warning',
    border: 'border-l-4 border-warning',
  },
};

export function Toast({ variant, message, duration = 5000, onClose, isVisible }: ToastProps) {
  useEffect(() => {
    if (!isVisible || duration === 0) return;
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [isVisible, duration, onClose]);

  if (!isVisible) return null;

  const { bg, icon, border } = variantConfig[variant];

  return (
    <div
      className={`
        fixed bottom-6 left-4 right-4 md:left-auto md:right-6 md:max-w-sm
        z-toast motion-safe:animate-slide-up
        ${bg} ${border}
        rounded-button shadow-elevated p-4
        flex items-center gap-3
      `}
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
    >
      <ToastIcon variant={variant} className={icon} />
      <p className="flex-1 text-sm font-medium text-text-primary-light dark:text-text-primary-dark">
        {message}
      </p>
      <button
        onClick={onClose}
        className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full
          hover:bg-black/5 dark:hover:bg-white/5
          focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        aria-label="Dismiss notification"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

function ToastIcon({ variant, className }: { variant: ToastVariant; className: string }) {
  switch (variant) {
    case 'success':
      return (
        <svg className={`w-5 h-5 ${className}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case 'error':
      return (
        <svg className={`w-5 h-5 ${className}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case 'warning':
      return (
        <svg className={`w-5 h-5 ${className}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      );
  }
}

// Toast manager hook for convenience
interface ToastItem {
  id: string;
  variant: ToastVariant;
  message: string;
  duration?: number;
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const show = useCallback((variant: ToastVariant, message: string, duration = 5000) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setToasts((prev) => [...prev, { id, variant, message, duration }]);
    return id;
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const success = useCallback((message: string) => show('success', message), [show]);
  const error = useCallback((message: string) => show('error', message), [show]);
  const warning = useCallback((message: string) => show('warning', message), [show]);

  return { toasts, show, dismiss, success, error, warning };
}
