'use client';

import React, { useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useStationDetail } from '@/hooks/useStations';
import { useCreateReservation, useActiveReservation } from '@/hooks/useReservation';
import { ReservationCountdown } from '@/components/driver/ReservationCountdown';
import { Button, SkeletonLoader, ErrorState } from '@/components/ui';

/**
 * Station Detail page
 * - Station photo header, back arrow, share icon
 * - Name, rating, address, hours, distance
 * - Real-time availability gauge
 * - Pricing, AI Prediction card
 * - Sticky bottom: "Reserve Battery" + "Get Directions"
 * - Error states: No battery available, Already has reservation
 */
export default function StationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const stationId = params.id as string;

  const { data: station, isLoading, isError, refetch } = useStationDetail(stationId);
  const { data: activeReservation } = useActiveReservation();
  const createReservation = useCreateReservation();

  const [reservationSuccess, setReservationSuccess] = useState(false);
  const [reservationError, setReservationError] = useState('');

  const hasActiveReservation = !!activeReservation;
  const noAvailableBatteries = station && station.availableCount === 0;

  const handleReserve = useCallback(async () => {
    setReservationError('');

    if (hasActiveReservation) {
      setReservationError('You already have an active reservation.');
      return;
    }

    try {
      await createReservation.mutateAsync(stationId);
      setReservationSuccess(true);
    } catch (err) {
      setReservationError(
        err instanceof Error ? err.message : 'Failed to create reservation'
      );
    }
  }, [stationId, hasActiveReservation, createReservation]);

  const handleGetDirections = useCallback(() => {
    if (!station) return;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${station.lat},${station.lng}`;
    window.open(url, '_blank');
  }, [station]);

  if (isLoading) {
    return <StationDetailSkeleton />;
  }

  if (isError || !station) {
    return (
      <div className="min-h-dvh flex items-center justify-center px-6">
        <ErrorState
          message="Station not found"
          description="We couldn't load this station's details."
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  // Show existing reservation state
  if (reservationSuccess || (hasActiveReservation && activeReservation?.stationId === stationId)) {
    const reservation = activeReservation;
    return (
      <div className="min-h-dvh bg-background-light dark:bg-background-dark">
        <Header onBack={() => router.back()} />
        <div className="px-6 py-8 flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-xl font-heading font-bold text-text-primary-light dark:text-text-primary-dark mb-2">
            Battery Reserved!
          </h1>
          <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark text-center mb-6">
            Head to {station.name} to complete your swap
          </p>
          {reservation?.expiresAt && (
            <ReservationCountdown
              expiresAt={reservation.expiresAt}
              onExpired={() => setReservationSuccess(false)}
              className="mb-6"
            />
          )}
          <Button variant="primary" size="lg" fullWidth onClick={handleGetDirections}>
            Get Directions
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background-light dark:bg-background-dark pb-32">
      {/* Photo header */}
      <div className="relative h-[200px] bg-gradient-to-b from-primary/20 to-primary/5">
        <Header onBack={() => router.back()} onShare={() => navigator.share?.({ title: station.name, url: window.location.href })} />
        <div className="absolute bottom-4 left-4 right-4">
          <h1 className="text-xl font-heading font-bold text-text-primary-light dark:text-text-primary-dark">
            {station.name}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <StarRating rating={station.rating} />
            <span className="text-xs text-text-secondary-light dark:text-text-secondary-dark">
              ({station.rating.toFixed(1)})
            </span>
          </div>
        </div>
      </div>

      {/* Info section */}
      <div className="px-4 py-4 space-y-4">
        {/* Address & hours */}
        <div className="space-y-2">
          <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark flex items-center gap-2">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
            </svg>
            {station.address}
          </p>
          <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-success flex-shrink-0" aria-hidden="true" />
            {station.hours}
          </p>
          {station.distance && (
            <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              {station.distance.toFixed(1)} km away
              {station.eta && ` • ${station.eta} min drive`}
            </p>
          )}
        </div>

        {/* Real-time availability */}
        <div className="p-4 rounded-card bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark">
          <h2 className="text-sm font-semibold text-text-primary-light dark:text-text-primary-dark mb-3">
            Real-Time Availability
          </h2>
          <div className="flex items-center gap-4">
            {/* Circular gauge */}
            <div className="relative w-16 h-16 flex-shrink-0">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 64 64" aria-hidden="true">
                <circle cx="32" cy="32" r="28" fill="none" stroke="currentColor" strokeWidth="6" className="text-gray-200 dark:text-gray-700" />
                <circle
                  cx="32" cy="32" r="28" fill="none" stroke="currentColor" strokeWidth="6"
                  strokeDasharray={`${2 * Math.PI * 28}`}
                  strokeDashoffset={`${2 * Math.PI * 28 * (1 - station.availableCount / station.totalSlots)}`}
                  strokeLinecap="round"
                  className="text-success"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-sm font-bold text-text-primary-light dark:text-text-primary-dark">
                  {station.availableCount}/{station.totalSlots}
                </span>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-success">
                {station.availableCount} batteries ready
              </p>
              {station.chargingCount > 0 && (
                <p className="text-xs text-warning mt-1">
                  {station.chargingCount} charging (ready in ~45 min)
                </p>
              )}
            </div>
          </div>
          {/* Staleness indicator */}
          <div className="flex items-center gap-1 mt-3 pt-3 border-t border-border-light dark:border-border-dark">
            <span className="text-xs text-text-secondary-light dark:text-text-secondary-dark">
              Last updated: {station.lastUpdated || '2 min ago'}
            </span>
            <button
              onClick={() => refetch()}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center text-primary"
              aria-label="Refresh availability"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>

        {/* Pricing */}
        <div className="p-4 rounded-card bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark">
          <p className="text-lg font-bold text-text-primary-light dark:text-text-primary-dark">
            ₦{station.pricePerSwap.toLocaleString()} per swap
          </p>
          <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark mt-1">
            Includes full charge (60km range)
          </p>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs text-text-secondary-light dark:text-text-secondary-dark">Accepted:</span>
            <span className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-800 rounded">Cash</span>
            <span className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-800 rounded">Transfer</span>
            <span className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-800 rounded">Wallet</span>
          </div>
        </div>

        {/* AI Prediction card */}
        {station.prediction && (
          <div className="p-4 rounded-card bg-gradient-to-r from-primary/5 to-accent/5 border border-primary/20">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-5 h-5 text-accent" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" />
              </svg>
              <span className="text-sm font-semibold text-text-primary-light dark:text-text-primary-dark">
                AI Insight
              </span>
            </div>
            <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
              Queue prediction: {station.prediction.waitTime || 'No wait now'}.
              {station.prediction.demand && ` Expected ${station.prediction.demand} demand.`}
            </p>
          </div>
        )}

        {/* Error states */}
        {noAvailableBatteries && (
          <div className="p-4 rounded-card bg-error/5 border border-error/20">
            <p className="text-sm font-medium text-error mb-1">No batteries available</p>
            <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark">
              Check back soon or try a nearby station.
            </p>
          </div>
        )}

        {hasActiveReservation && activeReservation?.stationId !== stationId && (
          <div className="p-4 rounded-card bg-warning/5 border border-warning/20">
            <p className="text-sm font-medium text-warning mb-1">You have an active reservation</p>
            <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark">
              Complete or cancel your current reservation before making a new one.
            </p>
          </div>
        )}

        {reservationError && (
          <p className="text-xs text-error text-center" role="alert">
            {reservationError}
          </p>
        )}
      </div>

      {/* Sticky bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-surface-light dark:bg-surface-dark border-t border-border-light dark:border-border-dark z-sticky">
        <Button
          variant="primary"
          size="lg"
          fullWidth
          onClick={handleReserve}
          isLoading={createReservation.isPending}
          disabled={noAvailableBatteries || hasActiveReservation}
        >
          Reserve Battery
        </Button>
        <Button
          variant="outlined"
          size="md"
          fullWidth
          onClick={handleGetDirections}
          className="mt-2"
        >
          Get Directions
        </Button>
        <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark text-center mt-2">
          Reservation holds for 15 minutes
        </p>
      </div>
    </div>
  );
}

/* Helper components */

function Header({ onBack, onShare }: { onBack: () => void; onShare?: () => void }) {
  return (
    <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4">
      <button
        onClick={onBack}
        className="min-w-[44px] min-h-[44px] flex items-center justify-center bg-surface-light/80 dark:bg-surface-dark/80 backdrop-blur-sm rounded-full shadow-soft focus-visible:ring-2 focus-visible:ring-primary"
        aria-label="Go back"
      >
        <svg className="w-5 h-5 text-text-primary-light dark:text-text-primary-dark" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
      </button>
      {onShare && (
        <button
          onClick={onShare}
          className="min-w-[44px] min-h-[44px] flex items-center justify-center bg-surface-light/80 dark:bg-surface-dark/80 backdrop-blur-sm rounded-full shadow-soft focus-visible:ring-2 focus-visible:ring-primary"
          aria-label="Share station"
        >
          <svg className="w-5 h-5 text-text-primary-light dark:text-text-primary-dark" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
          </svg>
        </button>
      )}
    </div>
  );
}

function StarRating({ rating }: { rating: number }) {
  const fullStars = Math.floor(rating);
  const hasHalf = rating - fullStars >= 0.5;

  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, i) => (
        <svg
          key={i}
          className={`w-4 h-4 ${
            i < fullStars
              ? 'text-accent'
              : i === fullStars && hasHalf
              ? 'text-accent'
              : 'text-gray-300 dark:text-gray-600'
          }`}
          fill="currentColor"
          viewBox="0 0 20 20"
          aria-hidden="true"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

function StationDetailSkeleton() {
  return (
    <div className="min-h-dvh bg-background-light dark:bg-background-dark">
      <div className="h-[200px] bg-gray-200 dark:bg-gray-800 animate-pulse" />
      <div className="px-4 py-4 space-y-4">
        <SkeletonLoader lines={3} />
        <div className="p-4 rounded-card bg-surface-light dark:bg-surface-dark">
          <SkeletonLoader variant="rounded" height="80px" />
        </div>
        <div className="p-4 rounded-card bg-surface-light dark:bg-surface-dark">
          <SkeletonLoader lines={2} />
        </div>
      </div>
    </div>
  );
}
