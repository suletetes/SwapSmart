'use client';

import React, { useState, useEffect } from 'react';
import { SkeletonLoader } from '@/components/ui/SkeletonLoader';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';

// --- Types ---
type ReservationState = 'Active' | 'EnRoute' | 'Arrived' | 'Swapping' | 'Completed' | 'Cancelled' | 'Expired';
type TabKey = 'active' | 'upcoming' | 'completed' | 'cancelled';

interface OperatorReservation {
  id: string;
  driverName: string;
  driverAvatar: string;
  vehicle: string;
  reservedBattery: string;
  eta: string;
  etaSeconds: number;
  state: ReservationState;
  extensionCount: number;
  isOverdue: boolean;
  createdAt: string;
}

// --- Mock Data ---
const mockReservations: OperatorReservation[] = [
  { id: 'res-1', driverName: 'Adebayo Ogunlesi', driverAvatar: 'AO', vehicle: 'Keke ABC-123', reservedBattery: 'BAT-005', eta: '0 min', etaSeconds: 0, state: 'Arrived', extensionCount: 0, isOverdue: false, createdAt: '10:30 AM' },
  { id: 'res-2', driverName: 'Fatima Bello', driverAvatar: 'FB', vehicle: 'Keke XYZ-789', reservedBattery: 'BAT-003', eta: '—', etaSeconds: 0, state: 'Swapping', extensionCount: 1, isOverdue: false, createdAt: '10:15 AM' },
  { id: 'res-3', driverName: 'Chioma Nwosu', driverAvatar: 'CN', vehicle: 'Keke DEF-456', reservedBattery: 'BAT-004', eta: '3 min', etaSeconds: 180, state: 'EnRoute', extensionCount: 0, isOverdue: false, createdAt: '10:45 AM' },
  { id: 'res-4', driverName: 'Ibrahim Musa', driverAvatar: 'IM', vehicle: 'Keke GHI-012', reservedBattery: 'BAT-007', eta: '8 min', etaSeconds: 480, state: 'Active', extensionCount: 0, isOverdue: true, createdAt: '10:50 AM' },
  { id: 'res-5', driverName: 'Ngozi Eze', driverAvatar: 'NE', vehicle: 'Keke JKL-345', reservedBattery: 'BAT-002', eta: '—', etaSeconds: 0, state: 'Completed', extensionCount: 0, isOverdue: false, createdAt: '9:30 AM' },
  { id: 'res-6', driverName: 'Yusuf Abdullahi', driverAvatar: 'YA', vehicle: 'Keke MNO-678', reservedBattery: 'BAT-009', eta: '—', etaSeconds: 0, state: 'Completed', extensionCount: 0, isOverdue: false, createdAt: '9:00 AM' },
  { id: 'res-7', driverName: 'Amina Suleiman', driverAvatar: 'AS', vehicle: 'Keke PQR-901', reservedBattery: 'BAT-001', eta: '—', etaSeconds: 0, state: 'Cancelled', extensionCount: 0, isOverdue: false, createdAt: '8:45 AM' },
  { id: 'res-8', driverName: 'Emeka Obi', driverAvatar: 'EO', vehicle: 'Keke STU-234', reservedBattery: 'BAT-008', eta: '—', etaSeconds: 0, state: 'Expired', extensionCount: 2, isOverdue: false, createdAt: '8:30 AM' },
];

function getTabReservations(tab: TabKey): OperatorReservation[] {
  switch (tab) {
    case 'active':
      return mockReservations.filter(r => r.state === 'Arrived' || r.state === 'Swapping');
    case 'upcoming':
      return mockReservations.filter(r => r.state === 'Active' || r.state === 'EnRoute');
    case 'completed':
      return mockReservations.filter(r => r.state === 'Completed');
    case 'cancelled':
      return mockReservations.filter(r => r.state === 'Cancelled' || r.state === 'Expired');
  }
}

// --- Sub-components ---

function StateBadge({ state }: { state: ReservationState }) {
  const config: Record<ReservationState, { bg: string; text: string }> = {
    Active: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400' },
    EnRoute: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-600 dark:text-purple-400' },
    Arrived: { bg: 'bg-success/10', text: 'text-success' },
    Swapping: { bg: 'bg-warning/10', text: 'text-warning' },
    Completed: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-600 dark:text-gray-400' },
    Cancelled: { bg: 'bg-error/10', text: 'text-error' },
    Expired: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-500 dark:text-gray-400' },
  };
  const { bg, text } = config[state];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${bg} ${text}`}>
      {state}
    </span>
  );
}

function ETACountdown({ seconds }: { seconds: number }) {
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => {
    if (remaining <= 0) return;
    const timer = setInterval(() => setRemaining(prev => Math.max(0, prev - 1)), 1000);
    return () => clearInterval(timer);
  }, [remaining]);

  if (remaining <= 0) return <span className="text-xs font-medium text-success">Arrived</span>;

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  return (
    <span className="text-xs font-mono text-text-primary-light dark:text-text-primary-dark">
      {mins}:{secs.toString().padStart(2, '0')}
    </span>
  );
}

function ReservationCard({ reservation }: { reservation: OperatorReservation }) {
  const getActionButtons = () => {
    switch (reservation.state) {
      case 'Arrived':
        return (
          <button className="min-h-[44px] px-4 py-2 text-xs font-medium rounded-button bg-primary text-white hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 transition-colors duration-fast">
            Start Swap
          </button>
        );
      case 'Swapping':
        return (
          <button className="min-h-[44px] px-4 py-2 text-xs font-medium rounded-button bg-success text-white hover:bg-success/90 focus-visible:ring-2 focus-visible:ring-success focus-visible:ring-offset-2 transition-colors duration-fast">
            Complete
          </button>
        );
      case 'EnRoute':
        return (
          <button className="min-h-[44px] px-4 py-2 text-xs font-medium rounded-button bg-primary text-white hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 transition-colors duration-fast">
            Confirm Arrival
          </button>
        );
      case 'Active':
        return (
          <button className="min-h-[44px] px-4 py-2 text-xs font-medium rounded-button bg-primary text-white hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 transition-colors duration-fast">
            Confirm Arrival
          </button>
        );
      default:
        return null;
    }
  };

  const showExtend = reservation.isOverdue && reservation.extensionCount < 2;
  const extendDisabled = reservation.extensionCount >= 2;

  return (
    <div className="p-4 rounded-card bg-surface-light dark:bg-surface-dark shadow-soft border border-border-light dark:border-border-dark">
      <div className="flex items-start justify-between gap-3">
        {/* Driver Info */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold text-primary">{reservation.driverAvatar}</span>
          </div>
          <div>
            <p className="text-sm font-medium text-text-primary-light dark:text-text-primary-dark">
              {reservation.driverName}
            </p>
            <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark">
              {reservation.vehicle}
            </p>
          </div>
        </div>
        <StateBadge state={reservation.state} />
      </div>

      {/* Details */}
      <div className="mt-3 grid grid-cols-3 gap-3 text-xs">
        <div>
          <span className="block text-text-secondary-light dark:text-text-secondary-dark">Battery</span>
          <span className="font-mono font-medium text-text-primary-light dark:text-text-primary-dark">
            {reservation.reservedBattery}
          </span>
        </div>
        <div>
          <span className="block text-text-secondary-light dark:text-text-secondary-dark">ETA</span>
          {reservation.etaSeconds > 0 ? (
            <ETACountdown seconds={reservation.etaSeconds} />
          ) : (
            <span className="font-medium text-text-primary-light dark:text-text-primary-dark">{reservation.eta}</span>
          )}
        </div>
        <div>
          <span className="block text-text-secondary-light dark:text-text-secondary-dark">Created</span>
          <span className="font-medium text-text-primary-light dark:text-text-primary-dark">{reservation.createdAt}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-4 flex items-center gap-2 flex-wrap">
        {getActionButtons()}

        {showExtend && (
          <button
            disabled={extendDisabled}
            className="min-h-[44px] px-3 py-2 text-xs font-medium rounded-button
              border border-warning text-warning
              hover:bg-warning/5 disabled:opacity-50 disabled:cursor-not-allowed
              focus-visible:ring-2 focus-visible:ring-warning focus-visible:ring-offset-2
              transition-colors duration-fast"
          >
            Extend ({2 - reservation.extensionCount} left)
          </button>
        )}

        {(reservation.state === 'Active' || reservation.state === 'EnRoute' || reservation.state === 'Arrived') && (
          <button className="min-h-[44px] px-3 py-2 text-xs font-medium rounded-button
            border border-error text-error
            hover:bg-error/5
            focus-visible:ring-2 focus-visible:ring-error focus-visible:ring-offset-2
            transition-colors duration-fast">
            Cancel & Release
          </button>
        )}
      </div>
    </div>
  );
}

function AutoRefreshIndicator() {
  const [countdown, setCountdown] = useState(10);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => (prev <= 1 ? 10 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex items-center gap-2 text-xs text-text-secondary-light dark:text-text-secondary-dark">
      <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-success/10 text-success">
        <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
        Live
      </span>
      <span>Refreshing in {countdown}s</span>
    </div>
  );
}

// --- Loading Skeleton ---
function ReservationsSkeleton() {
  return (
    <div className="p-4 lg:p-6 space-y-6" aria-busy="true" aria-label="Loading reservations">
      <SkeletonLoader variant="text" width="200px" height="28px" />
      <div className="flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonLoader key={i} variant="rounded" width="100px" height="40px" />
        ))}
      </div>
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="p-4 rounded-card bg-surface-light dark:bg-surface-dark shadow-soft">
            <div className="flex items-center gap-3 mb-3">
              <SkeletonLoader variant="circular" width="40px" height="40px" />
              <div className="flex-1">
                <SkeletonLoader variant="text" width="60%" />
                <SkeletonLoader variant="text" width="40%" className="mt-1" />
              </div>
            </div>
            <SkeletonLoader variant="text" width="80%" />
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Main Page ---
export default function ReservationsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('active');
  const [loading] = useState(false);
  const [error, setError] = useState(false);

  if (loading) return <ReservationsSkeleton />;
  if (error) return <ErrorState message="Failed to load reservations" onRetry={() => setError(false)} />;

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'active', label: 'Active' },
    { key: 'upcoming', label: 'Upcoming' },
    { key: 'completed', label: 'Completed' },
    { key: 'cancelled', label: 'Cancelled/Expired' },
  ];

  const tabReservations = getTabReservations(activeTab);

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-heading font-bold text-text-primary-light dark:text-text-primary-dark">
          Reservations
        </h1>
        <AutoRefreshIndicator />
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-border-light dark:border-border-dark pb-3">
        {tabs.map((tab) => {
          const count = getTabReservations(tab.key).length;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`min-h-[44px] px-4 py-2 text-sm font-medium rounded-button transition-colors duration-fast
                focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2
                ${isActive
                  ? 'bg-primary text-white'
                  : 'text-text-secondary-light dark:text-text-secondary-dark hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              aria-pressed={isActive}
            >
              {tab.label}
              <span className={`ml-2 inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold
                ${isActive ? 'bg-white/20 text-white' : 'bg-gray-200 dark:bg-gray-700 text-text-secondary-light dark:text-text-secondary-dark'}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      {tabReservations.length === 0 ? (
        <EmptyState
          message={`No ${activeTab} reservations`}
          description={activeTab === 'active' ? 'No drivers are currently at the station or swapping.' : 'No reservations in this category.'}
        />
      ) : (
        <div className="space-y-3">
          {tabReservations.map((reservation) => (
            <ReservationCard key={reservation.id} reservation={reservation} />
          ))}
        </div>
      )}
    </div>
  );
}
