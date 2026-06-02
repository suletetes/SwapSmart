'use client';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui';

interface OnboardingSlide {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
}

const slides: OnboardingSlide[] = [
  {
    title: 'Find Swap Stations Instantly',
    subtitle: 'See real-time battery availability at stations near you',
    icon: <MapIcon />,
  },
  {
    title: 'Reserve Your Battery',
    subtitle: 'One tap to reserve. No more queues.',
    icon: <ReserveIcon />,
  },
  {
    title: 'AI-Powered Predictions',
    subtitle: 'Know the best time to swap before you run low',
    icon: <AIIcon />,
  },
];

/**
 * Onboarding carousel — 3 slides with dot indicators,
 * Skip link top-right, "Get Started" green CTA on final slide.
 * Persists completion to localStorage.
 */
export default function OnboardingPage() {
  const router = useRouter();
  const [currentSlide, setCurrentSlide] = useState(0);

  const handleComplete = useCallback(() => {
    localStorage.setItem('swapsmart-onboarding-complete', 'true');
    router.push('/location-permission');
  }, [router]);

  const handleSkip = useCallback(() => {
    handleComplete();
  }, [handleComplete]);

  const handleNext = useCallback(() => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide((prev) => prev + 1);
    } else {
      handleComplete();
    }
  }, [currentSlide, handleComplete]);

  const isLastSlide = currentSlide === slides.length - 1;

  return (
    <div className="min-h-dvh flex flex-col bg-background-light dark:bg-background-dark px-6 py-8">
      {/* Skip link */}
      <div className="flex justify-end">
        <button
          onClick={handleSkip}
          className="min-h-[44px] min-w-[44px] px-4 py-2 text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark hover:text-primary focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-button transition-colors duration-normal"
          aria-label="Skip onboarding"
        >
          Skip
        </button>
      </div>

      {/* Slide content */}
      <div className="flex-1 flex flex-col items-center justify-center text-center">
        <div className="mb-8 motion-safe:animate-fade-in" key={currentSlide}>
          {slides[currentSlide].icon}
        </div>

        <h1 className="text-2xl font-heading font-bold text-text-primary-light dark:text-text-primary-dark mb-3 motion-safe:animate-fade-in">
          {slides[currentSlide].title}
        </h1>

        <p className="text-base text-text-secondary-light dark:text-text-secondary-dark max-w-xs motion-safe:animate-fade-in">
          {slides[currentSlide].subtitle}
        </p>
      </div>

      {/* Bottom section: dots + CTA */}
      <div className="flex flex-col items-center gap-6 pb-8">
        {/* Dot indicators */}
        <div className="flex items-center gap-2" role="tablist" aria-label="Onboarding slides">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`min-h-[44px] min-w-[44px] flex items-center justify-center`}
              role="tab"
              aria-selected={index === currentSlide}
              aria-label={`Slide ${index + 1} of ${slides.length}`}
            >
              <span
                className={`block rounded-full transition-all duration-normal ${
                  index === currentSlide
                    ? 'w-8 h-2 bg-primary'
                    : 'w-2 h-2 bg-gray-300 dark:bg-gray-600'
                }`}
              />
            </button>
          ))}
        </div>

        {/* CTA Button */}
        <Button
          variant="primary"
          size="lg"
          fullWidth
          onClick={handleNext}
        >
          {isLastSlide ? 'Get Started' : 'Next'}
        </Button>
      </div>
    </div>
  );
}

/* Slide illustrations */
function MapIcon() {
  return (
    <svg width="160" height="160" viewBox="0 0 160 160" fill="none" aria-hidden="true">
      <circle cx="80" cy="80" r="70" fill="#10B981" opacity="0.1" />
      <circle cx="80" cy="80" r="50" fill="#10B981" opacity="0.15" />
      {/* Map pin */}
      <path d="M80 40 C63 40 50 53 50 70 C50 95 80 120 80 120 C80 120 110 95 110 70 C110 53 97 40 80 40Z" fill="#10B981" opacity="0.8" />
      <circle cx="80" cy="68" r="12" fill="white" />
      {/* Keke silhouette */}
      <path d="M74 65 L80 60 L86 65 L86 72 L74 72 Z" fill="#10B981" />
    </svg>
  );
}

function ReserveIcon() {
  return (
    <svg width="160" height="160" viewBox="0 0 160 160" fill="none" aria-hidden="true">
      <circle cx="80" cy="80" r="70" fill="#10B981" opacity="0.1" />
      <circle cx="80" cy="80" r="50" fill="#10B981" opacity="0.15" />
      {/* Phone outline */}
      <rect x="55" y="40" width="50" height="80" rx="10" stroke="#10B981" strokeWidth="3" fill="white" />
      {/* Screen content - checkmark */}
      <circle cx="80" cy="75" r="18" fill="#10B981" opacity="0.2" />
      <path d="M72 75 L78 81 L90 69" stroke="#10B981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      {/* Notification dot */}
      <circle cx="95" cy="50" r="6" fill="#F59E0B" />
    </svg>
  );
}

function AIIcon() {
  return (
    <svg width="160" height="160" viewBox="0 0 160 160" fill="none" aria-hidden="true">
      <circle cx="80" cy="80" r="70" fill="#10B981" opacity="0.1" />
      <circle cx="80" cy="80" r="50" fill="#10B981" opacity="0.15" />
      {/* Battery gauge */}
      <rect x="55" y="55" width="30" height="50" rx="6" stroke="#10B981" strokeWidth="3" fill="none" />
      <rect x="63" y="49" width="14" height="6" rx="3" fill="#10B981" />
      <rect x="59" y="75" width="22" height="26" rx="3" fill="#10B981" opacity="0.4" />
      {/* Upward graph */}
      <polyline points="95,100 105,85 115,90 125,65" stroke="#10B981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      {/* Sparkle */}
      <path d="M115 55 L117 50 L119 55 L124 57 L119 59 L117 64 L115 59 L110 57 Z" fill="#F59E0B" />
    </svg>
  );
}
