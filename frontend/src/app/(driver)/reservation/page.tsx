'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ReservationCountdown } from '@/components/driver/ReservationCountdown';
import { Button } from '@/components/ui/Button';
import { ModalSheet } from '@/components/ui/ModalSheet';
import { useActiveReservation, useCancelReservation } from '@/hooks/useReservation';

type ViewState = 'EnRoute' | 'Arrived' | 'Expired' | 'Error';

export default function ReservationPage() {
  const router = useRouter();
  const { data: reservation, isLoading, isError, refetch } = useActiveReservation();
  const cancelMutation = useCancelReservation();

  const [viewState, setViewState] = useState<ViewState>('EnRoute');
  const [showExpiryModal, setShowExpiryModal] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [isWithinRange, setIsWithinRange] = useState(false);
  const [eta] = useState<string>('5 min');

  // Determine view state from reservation data
  useEffect(() => {
    if (!reservation) return;
    if (reservation.state === 'Arrived') {
      setViewState('Arrived');
    } else if (reservation.state === 'Expired') {
      setViewState('Expired');
      setShowExpiryModal(true);
    } else if (reservation.state === 'EnRoute' || reservation.state === 'Active') {
      setViewState('EnRoute');
    }
  }, [reservation]);

  // Geolocation tracking for proximity check
  useEffect(() => {
    if (!navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;

        // Check if within 100m of station (placeholder coordinates)
        if (reservation) {
          const distance = calculateDistance(
            latitude,
            longitude,
            6.5244, // placeholder station lat
            3.3792  // placeholder station lng
          );
          setIsWithinRange(distance <= 100);
        }
      },
      () => {
        // Geolocation error — still allow manual arrival
      },
      { enableHighAccuracy: true, maximumAge: 5000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [reservation]);

  const handleExpired = useCallback(() => {
    setViewState('Expired');
    setShowExpiryModal(true);
  }, []);

  const handleArrived = async () => {
    if (!reservation) return;
    try {
      const response = await fetch(`/api/v1/reservations/${reservation.reservationId}/arrive`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
      });
      if (response.ok) {
        setViewState('Arrived');
        refetch();
      }
    } catch {
      // Error handled by state
    }
  };

  const handleCancel = async () => {
    if (!reservation) return;
    cancelMutation.mutate(reservation.reservationId, {
      onSuccess: () => {
        setShowCancelDialog(false);
        router.push('/');
      },
    });
  };

  const handleReReserve = () => {
    setShowExpiryModal(false);
    if (reservation) {
      router.push(`/station/${reservation.stationId}`);
    }
  };

  const handleFindAnother = () => {
    setShowExpiryModal(false);
    router.push('/');
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-background-light dark:bg-background-dark">
        <div className="animate-pulse text-center">
          <div className="w-16 h-16 rounded-full bg-gray-200 dark:bg-gray-700 mx-auto mb-4" />
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-40 mx-auto" />
        </div>
      </div>
    );
  }

  // Error state
  if (isError || viewState === 'Error') {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center px-6 bg-background-light dark:bg-background-dark">
        <svg className="w-16 h-16 text-error mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
        <h2 className="text-lg font-heading font-semibold text-text-primary-light dark:text-text-primary-dark mb-2">
          Route Unavailable
        </h2>
        <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark mb-6 text-center">
          We couldn&apos;t load the route to the station. Please check your connection and try again.
        </p>
        <Button onClick={() => refetch()} variant="primary">
          Retry
        </Button>
      </div>
    );
  }

  // No active reservation
  if (!reservation) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center px-6 bg-background-light dark:bg-background-dark">
        <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark mb-4">
          No active reservation found
        </p>
        <Button onClick={() => router.push('/')} variant="primary">
          Find a Station
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex flex-col bg-background-light dark:bg-background-dark">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-surface-light dark:bg-surface-dark border-b border-border-light dark:border-border-dark">
        <button
          onClick={() => router.back()}
          className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 focus-visible:ring-2 focus-visible:ring-primary"
          aria-label="Go back"
        >
          <svg className="w-5 h-5 text-text-primary-light dark:text-text-primary-dark" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-base font-heading font-semibold text-text-primary-light dark:text-text-primary-dark">
          {viewState === 'Arrived' ? 'You\'ve Arrived' : 'En Route'}
        </h1>
        <button
          onClick={() => setShowCancelDialog(true)}
          className="min-w-[44px] min-h-[44px] flex items-center justify-center text-error text-sm font-medium focus-visible:ring-2 focus-visible:ring-primary rounded"
          aria-label="Cancel reservation"
        >
          Cancel
        </button>
      </header>

      {/* Map placeholder with route line */}
      <div className="relative flex-1 min-h-[250px] bg-gray-100 dark:bg-gray-900" aria-label="Map showing route to station">
        {/* Placeholder map */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative w-full h-full overflow-hidden">
            {/* Grid pattern for map placeholder */}
            <div className="absolute inset-0 opacity-10 dark:opacity-5" style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 40px, #10B981 40px, #10B981 1px), repeating-linear-gradient(90deg, transparent, transparent 40px, #10B981 40px, #10B981 1px)' }} />
            
            {/* Route line */}
            <svg className="absolute inset-0 w-full h-full" aria-hidden="true">
              <path
                d="M 80 350 Q 150 250 200 200 Q 250 150 300 120 Q 350 90 380 60"
                fill="none"
                stroke="#10B981"
                strokeWidth="4"
                strokeDasharray="8 4"
                className="motion-safe:animate-pulse"
              />
              {/* Driver marker */}
              <circle cx="80" cy="350" r="8" fill="#10B981" />
              <circle cx="80" cy="350" r="12" fill="none" stroke="#10B981" strokeWidth="2" opacity="0.5" />
              {/* Station marker */}
              <circle cx="380" cy="60" r="8" fill="#F59E0B" />
              <circle cx="380" cy="60" r="12" fill="none" stroke="#F59E0B" strokeWidth="2" opacity="0.5" />
            </svg>

            {/* ETA badge */}
            <div className="absolute top-4 left-4 bg-surface-light dark:bg-surface-dark rounded-card px-4 py-2 shadow-soft">
              <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark">ETA</p>
              <p className="text-base font-bold text-text-primary-light dark:text-text-primary-dark">{eta}</p>
            </div>

            {/* Station name badge */}
            <div className="absolute top-4 right-4 bg-surface-light dark:bg-surface-dark rounded-card px-4 py-2 shadow-soft">
              <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark">Station</p>
              <p className="text-sm font-semibold text-text-primary-light dark:text-text-primary-dark truncate max-w-[140px]">
                {reservation.stationName}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom panel */}
      <div className="bg-surface-light dark:bg-surface-dark rounded-t-bottom-sheet shadow-elevated px-6 py-5 space-y-4">
        {/* Countdown */}
        {viewState === 'EnRoute' && (
          <>
            <ReservationCountdown
              expiresAt={reservation.expiresAt}
              onExpired={handleExpired}
            />

            {/* Arrived button */}
            <Button
              fullWidth
              size="lg"
              variant="primary"
              disabled={!isWithinRange}
              onClick={handleArrived}
              aria-label={isWithinRange ? "Confirm arrival at station" : "You must be within 100m of the station"}
            >
              {isWithinRange ? "I've Arrived" : "Get closer to station (100m)"}
            </Button>

            {!isWithinRange && (
              <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark text-center">
                The button will activate when you&apos;re within 100m of the station
              </p>
            )}
          </>
        )}

        {/* Swap code display on arrival */}
        {viewState === 'Arrived' && reservation.swapCode && (
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-success/10 mb-2">
              <svg className="w-8 h-8 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-lg font-heading font-semibold text-text-primary-light dark:text-text-primary-dark">
              Show this code to the operator
            </h2>
            {/* Large 4-digit swap code */}
            <div className="flex justify-center gap-3" aria-label={`Swap code: ${reservation.swapCode}`}>
              {reservation.swapCode.split('').map((digit, i) => (
                <div
                  key={i}
                  className="w-16 h-20 flex items-center justify-center bg-primary/10 dark:bg-primary/20 border-2 border-primary rounded-card"
                >
                  <span className="text-3xl font-bold text-primary">{digit}</span>
                </div>
              ))}
            </div>
            <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
              The operator will verify this code to start your swap
            </p>
          </div>
        )}
      </div>

      {/* Expiry Modal */}
      <ModalSheet
        isOpen={showExpiryModal}
        onClose={() => setShowExpiryModal(false)}
        title="Reservation Expired"
      >
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-error/10 mx-auto">
            <svg className="w-8 h-8 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-heading font-semibold text-text-primary-light dark:text-text-primary-dark">
            Your reservation has expired
          </h3>
          <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
            The 15-minute hold has elapsed. The battery has been released back to the station.
          </p>
          <div className="flex flex-col gap-3 pt-2">
            <Button fullWidth variant="primary" onClick={handleReReserve}>
              Re-reserve at this station
            </Button>
            <Button fullWidth variant="outlined" onClick={handleFindAnother}>
              Find Another Station
            </Button>
          </div>
        </div>
      </ModalSheet>

      {/* Cancel Confirmation Dialog */}
      <ModalSheet
        isOpen={showCancelDialog}
        onClose={() => setShowCancelDialog(false)}
        title="Cancel Reservation?"
      >
        <div className="space-y-4">
          <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
            Are you sure you want to cancel this reservation? The battery will be released and made available to other drivers.
          </p>
          <div className="flex flex-col gap-3">
            <Button
              fullWidth
              variant="primary"
              onClick={handleCancel}
              isLoading={cancelMutation.isPending}
              className="!bg-error hover:!bg-error/90"
            >
              Yes, Cancel Reservation
            </Button>
            <Button
              fullWidth
              variant="outlined"
              onClick={() => setShowCancelDialog(false)}
            >
              Keep Reservation
            </Button>
          </div>
        </div>
      </ModalSheet>
    </div>
  );
}

/** Calculate distance between two coordinates in meters (Haversine formula) */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
