'use client';

import React, { useState, useCallback } from 'react';
import { useAuthStore } from '@/stores/auth.store';

/**
 * Floating Action Button + AI recommendation popup.
 * Tapping opens AI recommendation: "Best swap time: 2:30 PM (predicted low queue)"
 */
export function AIRecommendation() {
  const [isOpen, setIsOpen] = useState(false);
  const [recommendation, setRecommendation] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const token = useAuthStore((s) => s.tokens?.accessToken);

  const fetchRecommendation = useCallback(async () => {
    if (recommendation) {
      setIsOpen(!isOpen);
      return;
    }

    setIsOpen(true);
    setIsLoading(true);

    try {
      const response = await fetch('/api/v1/predictions/swap-time', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setRecommendation(
          data.recommendation ||
            `Best swap time: ${data.optimalTime || '2:30 PM'} (predicted ${data.waitTime || 'low queue'})`
        );
      } else {
        setRecommendation('AI prediction unavailable. Try again later.');
      }
    } catch {
      setRecommendation('Unable to load prediction. Check your connection.');
    } finally {
      setIsLoading(false);
    }
  }, [isOpen, recommendation, token]);

  return (
    <div className="relative">
      {/* Popup */}
      {isOpen && (
        <div
          className="absolute bottom-16 right-0 w-72 p-4 bg-surface-light dark:bg-surface-dark rounded-card shadow-elevated border border-border-light dark:border-border-dark motion-safe:animate-slide-up"
          role="dialog"
          aria-label="AI Recommendation"
        >
          <div className="flex items-start gap-2 mb-2">
            <SparkleIcon className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
            <h3 className="text-sm font-heading font-semibold text-text-primary-light dark:text-text-primary-dark">
              AI Insight
            </h3>
          </div>
          {isLoading ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full motion-safe:animate-spin" />
              <span className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
                Analyzing patterns...
              </span>
            </div>
          ) : (
            <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
              {recommendation}
            </p>
          )}
          <button
            onClick={() => setIsOpen(false)}
            className="absolute top-2 right-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-text-secondary-light dark:text-text-secondary-dark hover:text-text-primary-light dark:hover:text-text-primary-dark"
            aria-label="Close recommendation"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* FAB */}
      <button
        onClick={fetchRecommendation}
        className="w-14 h-14 rounded-full bg-primary text-white shadow-elevated flex items-center justify-center hover:bg-primary/90 active:bg-primary/80 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 transition-colors duration-normal"
        aria-label="Get AI recommendation"
      >
        <SparkleIcon className="w-6 h-6" />
      </button>
    </div>
  );
}

function SparkleIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" />
    </svg>
  );
}

export default AIRecommendation;
