'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Root page — acts as the Splash Screen entry point.
 * - Full emerald green background
 * - White SwapSmart logo (battery + swap arrow SVG)
 * - Tagline "Never wait for a charge again"
 * - "Powered by AWS" badge
 * - Pulse animation (respects reduced-motion)
 */
export default function SplashPage() {
  const router = useRouter();
  const [show, setShow] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShow(false);
      // Check if onboarding was completed
      const onboardingDone = localStorage.getItem('swapsmart-onboarding-complete');
      if (onboardingDone === 'true') {
        router.push('/login');
      } else {
        router.push('/onboarding');
      }
    }, 2500);

    return () => clearTimeout(timer);
  }, [router]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-primary z-modal">
      {/* Logo with pulse animation */}
      <div className="motion-safe:animate-pulse" aria-hidden="true">
        <SwapSmartLogo />
      </div>

      {/* Tagline */}
      <p className="mt-6 text-white/90 text-lg font-body text-center px-6">
        Never wait for a charge again
      </p>

      {/* Powered by AWS badge */}
      <div className="absolute bottom-12 flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full">
        <span className="text-white/70 text-xs font-medium">Powered by</span>
        <span className="text-white font-semibold text-sm">AWS</span>
      </div>
    </div>
  );
}

function SwapSmartLogo() {
  return (
    <svg
      width="120"
      height="120"
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="SwapSmart logo"
      role="img"
    >
      {/* Battery body */}
      <rect x="30" y="35" width="50" height="55" rx="8" stroke="white" strokeWidth="4" fill="none" />
      {/* Battery cap */}
      <rect x="45" y="25" width="20" height="10" rx="4" fill="white" />
      {/* Charge level */}
      <rect x="36" y="55" width="38" height="29" rx="4" fill="white" opacity="0.3" />
      {/* Swap arrow - circular */}
      <path
        d="M85 55 C95 55 100 65 95 72 L90 68"
        stroke="white"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M95 72 L98 66"
        stroke="white"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M25 65 C15 65 10 55 15 48 L20 52"
        stroke="white"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M15 48 L12 54"
        stroke="white"
        strokeWidth="3"
        strokeLinecap="round"
      />
      {/* Lightning bolt inside battery */}
      <path
        d="M55 45 L48 60 H56 L50 75"
        stroke="white"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}
