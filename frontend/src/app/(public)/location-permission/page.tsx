'use client';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui';

type PermissionState = 'prompt' | 'denied';

/**
 * Location Permission Request screen
 * - Illustration area, "Enable Location Access" heading, 3 benefit bullet points
 * - "Allow Location Access" green button, "Not Now" gray link
 * - Permission denied state with "Open Settings" + "Continue in Limited Mode"
 */
export default function LocationPermissionPage() {
  const router = useRouter();
  const [permissionState, setPermissionState] = useState<PermissionState>('prompt');
  const [isRequesting, setIsRequesting] = useState(false);

  const handleAllowLocation = useCallback(async () => {
    setIsRequesting(true);
    try {
      const result = await navigator.permissions.query({ name: 'geolocation' });

      if (result.state === 'granted') {
        router.push('/login');
        return;
      }

      // Request actual geolocation to trigger the browser prompt
      navigator.geolocation.getCurrentPosition(
        () => {
          // Permission granted
          router.push('/login');
        },
        (error) => {
          if (error.code === error.PERMISSION_DENIED) {
            setPermissionState('denied');
          }
          setIsRequesting(false);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } catch {
      // Fallback: try geolocation directly
      navigator.geolocation.getCurrentPosition(
        () => router.push('/login'),
        () => {
          setPermissionState('denied');
          setIsRequesting(false);
        }
      );
    }
  }, [router]);

  const handleSkip = useCallback(() => {
    router.push('/login');
  }, [router]);

  if (permissionState === 'denied') {
    return <PermissionDeniedState onContinue={handleSkip} />;
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center bg-background-light dark:bg-background-dark px-6 py-8">
      {/* Illustration */}
      <div className="mb-8">
        <LocationIllustration />
      </div>

      {/* Heading */}
      <h1 className="text-2xl font-heading font-bold text-text-primary-light dark:text-text-primary-dark mb-3 text-center">
        Enable Location Access
      </h1>

      <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark text-center max-w-xs mb-8">
        SwapSmart needs your location to find nearby battery swap stations and calculate routes.
        Your location is never shared with other drivers.
      </p>

      {/* Benefits */}
      <ul className="w-full max-w-xs space-y-4 mb-10">
        <BenefitItem
          icon={<PinIcon />}
          text="Find the nearest swap stations in real-time"
        />
        <BenefitItem
          icon={<RouteIcon />}
          text="Get turn-by-turn directions to stations"
        />
        <BenefitItem
          icon={<ClockIcon />}
          text="Accurate ETA and distance calculations"
        />
      </ul>

      {/* CTA Buttons */}
      <div className="w-full max-w-xs space-y-3">
        <Button
          variant="primary"
          size="lg"
          fullWidth
          onClick={handleAllowLocation}
          isLoading={isRequesting}
        >
          Allow Location Access
        </Button>

        <button
          onClick={handleSkip}
          className="w-full min-h-[44px] text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark hover:text-text-primary-light dark:hover:text-text-primary-dark transition-colors duration-normal focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-button"
        >
          Not Now
        </button>

        <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark text-center">
          You can change this later in Settings
        </p>
      </div>
    </div>
  );
}

function PermissionDeniedState({ onContinue }: { onContinue: () => void }) {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center bg-background-light dark:bg-background-dark px-6 py-8">
      {/* Warning illustration */}
      <div className="mb-6">
        <div className="w-20 h-20 rounded-full bg-warning/10 flex items-center justify-center">
          <svg className="w-10 h-10 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>
      </div>

      {/* Warning banner */}
      <div className="w-full max-w-xs bg-warning/10 border border-warning/30 rounded-card p-4 mb-6" role="alert">
        <p className="text-sm text-warning font-medium text-center">
          Location access is required for core features
        </p>
      </div>

      <h1 className="text-xl font-heading font-bold text-text-primary-light dark:text-text-primary-dark mb-2 text-center">
        Location Access Denied
      </h1>

      <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark text-center max-w-xs mb-8">
        Without location access, you won&apos;t be able to find nearby stations or get directions.
        You can enable it in your device settings.
      </p>

      {/* Actions */}
      <div className="w-full max-w-xs space-y-3">
        <Button
          variant="primary"
          size="lg"
          fullWidth
          onClick={() => {
            // Attempt to open app settings (works on some mobile browsers)
            window.open('app-settings:', '_self');
          }}
        >
          Open Settings
        </Button>

        <button
          onClick={onContinue}
          className="w-full min-h-[44px] px-6 py-3 text-sm font-medium text-text-secondary-light dark:text-text-secondary-dark border border-border-light dark:border-border-dark rounded-button hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-normal focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          Continue in Limited Mode
        </button>
      </div>
    </div>
  );
}

/* Helper components */
function BenefitItem({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <li className="flex items-center gap-3">
      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
        {icon}
      </div>
      <span className="text-sm text-text-primary-light dark:text-text-primary-dark">
        {text}
      </span>
    </li>
  );
}

function LocationIllustration() {
  return (
    <svg width="140" height="140" viewBox="0 0 140 140" fill="none" aria-hidden="true">
      <circle cx="70" cy="70" r="65" fill="#10B981" opacity="0.08" />
      <circle cx="70" cy="70" r="45" fill="#10B981" opacity="0.12" />
      {/* Map pin */}
      <path d="M70 30 C55 30 43 42 43 57 C43 80 70 110 70 110 C70 110 97 80 97 57 C97 42 85 30 70 30Z" fill="#10B981" opacity="0.7" />
      <circle cx="70" cy="55" r="14" fill="white" />
      {/* Pulsing rings */}
      <circle cx="70" cy="55" r="8" fill="#10B981" opacity="0.5" />
      <circle cx="70" cy="55" r="4" fill="#10B981" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
    </svg>
  );
}

function RouteIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
