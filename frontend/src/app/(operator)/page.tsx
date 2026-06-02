'use client';

import React, { useState } from 'react';
import { SkeletonLoader } from '@/components/ui/SkeletonLoader';
import { ErrorState } from '@/components/ui/ErrorState';

// --- Types ---
type BatteryStatus = 'Ready' | 'Charging' | 'Reserved' | 'Depleted' | 'Maintenance';

interface BatterySlot {
  slotNumber: number;
  batteryId: string;
  chargePercent: number;
  status: BatteryStatus;
}

interface Reservation {
  id: string;
  driverName: string;
  eta: string;
  assignedBattery: string;
}

interface DashboardMetrics {
  available: number;
  totalSlots: number;
  swapsToday: number;
  swapsYesterday: number;
  revenueToday: number;
  revenueTrend: number;
  avgWaitTime: number;
}

// --- Mock Data ---
const mockMetrics: DashboardMetrics = {
  available: 7,
  totalSlots: 10,
  swapsToday: 23,
  swapsYesterday: 19,
  revenueToday: 34500,
  revenueTrend: 12.5,
  avgWaitTime: 4.2,
};

const mockBatteries: BatterySlot[] = [
  { slotNumber: 1, batteryId: 'BAT-001', chargePercent: 100, status: 'Ready' },
  { slotNumber: 2, batteryId: 'BAT-002', chargePercent: 100, status: 'Ready' },
  { slotNumber: 3, batteryId: 'BAT-003', chargePercent: 78, status: 'Charging' },
  { slotNumber: 4, batteryId: 'BAT-004', chargePercent: 100, status: 'Ready' },
  { slotNumber: 5, batteryId: 'BAT-005', chargePercent: 100, status: 'Reserved' },
  { slotNumber: 6, batteryId: 'BAT-006', chargePercent: 45, status: 'Charging' },
  { slotNumber: 7, batteryId: 'BAT-007', chargePercent: 100, status: 'Ready' },
  { slotNumber: 8, batteryId: 'BAT-008', chargePercent: 100, status: 'Ready' },
  { slotNumber: 9, batteryId: 'BAT-009', chargePercent: 100, status: 'Ready' },
  { slotNumber: 10, batteryId: 'BAT-010', chargePercent: 15, status: 'Depleted' },
];

const mockReservations: Reservation[] = [
  { id: 'res-1', driverName: 'Adebayo Ogunlesi', eta: '3 min', assignedBattery: 'BAT-005' },
  { id: 'res-2', driverName: 'Chioma Nwosu', eta: '8 min', assignedBattery: 'BAT-004' },
  { id: 'res-3', driverName: 'Ibrahim Musa', eta: '15 min', assignedBattery: 'BAT-007' },
];

// --- Sub-components ---

function CircularGauge({ value, max, label }: { value: number; max: number; label: string }) {
  const percentage = (value / max) * 100;
  const circumference = 2 * Math.PI * 28;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex items-center gap-3">
      <svg className="w-14 h-14 -rotate-90" viewBox="0 0 64 64" aria-hidden="true">
        <circle cx="32" cy="32" r="28" fill="none" stroke="currentColor" strokeWidth="4"
          className="text-gray-200 dark:text-gray-700" />
        <circle cx="32" cy="32" r="28" fill="none" stroke="currentColor" strokeWidth="4"
          className="text-primary"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round" />
      </svg>
      <div>
        <p className="text-2xl font-heading font-bold text-text-primary-light dark:text-text-primary-dark">
          {value}/{max}
        </p>
        <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark">{label}</p>
      </div>
    </div>
  );
}

function MetricCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`p-4 rounded-card bg-surface-light dark:bg-surface-dark shadow-soft ${className}`}>
      {children}
    </div>
  );
}

function BatteryStatusBadge({ status }: { status: BatteryStatus }) {
  const config: Record<BatteryStatus, { bg: string; text: string }> = {
    Ready: { bg: 'bg-success/10', text: 'text-success' },
    Charging: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400' },
    Reserved: { bg: 'bg-warning/10', text: 'text-warning' },
    Depleted: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-500 dark:text-gray-400' },
    Maintenance: { bg: 'bg-error/10', text: 'text-error' },
  };
  const { bg, text } = config[status];

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${bg} ${text}`}>
      {status}
    </span>
  );
}

function BatterySlotCard({ slot }: { slot: BatterySlot }) {
  return (
    <div className="p-3 rounded-button border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-text-secondary-light dark:text-text-secondary-dark">
          Slot {slot.slotNumber}
        </span>
        <BatteryStatusBadge status={slot.status} />
      </div>
      <p className="text-xs font-mono text-text-primary-light dark:text-text-primary-dark mb-1">
        {slot.batteryId}
      </p>
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-normal ${
              slot.chargePercent >= 80 ? 'bg-success' :
              slot.chargePercent >= 40 ? 'bg-warning' : 'bg-error'
            }`}
            style={{ width: `${slot.chargePercent}%` }}
          />
        </div>
        <span className="text-[10px] font-medium text-text-secondary-light dark:text-text-secondary-dark">
          {slot.chargePercent}%
        </span>
      </div>
    </div>
  );
}

function ReservationItem({ reservation, onAccept, onReassign }: {
  reservation: Reservation;
  onAccept: () => void;
  onReassign: () => void;
}) {
  return (
    <div className="flex items-center justify-between p-3 rounded-button border border-border-light dark:border-border-dark">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
          <span className="text-xs font-bold text-primary">
            {reservation.driverName.split(' ').map(n => n[0]).join('')}
          </span>
        </div>
        <div>
          <p className="text-sm font-medium text-text-primary-light dark:text-text-primary-dark">
            {reservation.driverName}
          </p>
          <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark">
            ETA: {reservation.eta} · {reservation.assignedBattery}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onAccept}
          className="min-h-[44px] min-w-[44px] px-3 py-2 text-xs font-medium rounded-button
            bg-primary text-white hover:bg-primary/90
            focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2
            transition-colors duration-fast"
        >
          Accept
        </button>
        <button
          onClick={onReassign}
          className="min-h-[44px] min-w-[44px] px-3 py-2 text-xs font-medium rounded-button
            border border-border-light dark:border-border-dark
            text-text-secondary-light dark:text-text-secondary-dark
            hover:bg-gray-50 dark:hover:bg-gray-800
            focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2
            transition-colors duration-fast"
        >
          Reassign
        </button>
      </div>
    </div>
  );
}

// --- Loading Skeleton ---
function DashboardSkeleton() {
  return (
    <div className="p-4 lg:p-6 space-y-6" aria-busy="true" aria-label="Loading dashboard">
      {/* Metric cards skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="p-4 rounded-card bg-surface-light dark:bg-surface-dark shadow-soft">
            <SkeletonLoader variant="text" width="60%" />
            <SkeletonLoader variant="text" width="40%" className="mt-2" height="24px" />
          </div>
        ))}
      </div>
      {/* Grid skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="p-3 rounded-button border border-border-light dark:border-border-dark">
            <SkeletonLoader variant="text" width="80%" />
            <SkeletonLoader variant="text" width="50%" className="mt-2" />
            <SkeletonLoader variant="rectangular" height="8px" className="mt-2 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Main Page ---
export default function OperatorDashboardPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  if (loading) return <DashboardSkeleton />;
  if (error) return <ErrorState message="Failed to load dashboard" onRetry={() => setError(false)} />;

  const swapChange = mockMetrics.swapsYesterday > 0
    ? Math.round(((mockMetrics.swapsToday - mockMetrics.swapsYesterday) / mockMetrics.swapsYesterday) * 100)
    : 0;

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-heading font-bold text-text-primary-light dark:text-text-primary-dark">
            Dashboard
          </h1>
          <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
            Ikeja Station · Real-time overview
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium bg-success/10 text-success">
            <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
            Live
          </span>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Batteries Available */}
        <MetricCard>
          <CircularGauge value={mockMetrics.available} max={mockMetrics.totalSlots} label="Batteries Available" />
        </MetricCard>

        {/* Today's Swaps */}
        <MetricCard>
          <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark mb-1">Today&apos;s Swaps</p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-heading font-bold text-text-primary-light dark:text-text-primary-dark">
              {mockMetrics.swapsToday}
            </span>
            <span className={`text-xs font-medium ${swapChange >= 0 ? 'text-success' : 'text-error'}`}>
              {swapChange >= 0 ? '+' : ''}{swapChange}% vs yesterday
            </span>
          </div>
        </MetricCard>

        {/* Revenue Today */}
        <MetricCard>
          <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark mb-1">Revenue Today</p>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-heading font-bold text-text-primary-light dark:text-text-primary-dark">
              ₦{mockMetrics.revenueToday.toLocaleString()}
            </span>
            <span className={`text-xs font-medium ${mockMetrics.revenueTrend >= 0 ? 'text-success' : 'text-error'}`}>
              {mockMetrics.revenueTrend >= 0 ? '↑' : '↓'}{Math.abs(mockMetrics.revenueTrend)}%
            </span>
          </div>
        </MetricCard>

        {/* Avg Wait Time */}
        <MetricCard>
          <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark mb-1">Avg Wait Time</p>
          <span className="text-2xl font-heading font-bold text-text-primary-light dark:text-text-primary-dark">
            {mockMetrics.avgWaitTime} min
          </span>
        </MetricCard>
      </div>

      {/* Real-time Inventory Grid */}
      <section>
        <h2 className="text-base font-heading font-semibold text-text-primary-light dark:text-text-primary-dark mb-3">
          Battery Inventory
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {mockBatteries.map((slot) => (
            <BatterySlotCard key={slot.slotNumber} slot={slot} />
          ))}
        </div>
      </section>

      {/* Upcoming Reservations */}
      <section>
        <h2 className="text-base font-heading font-semibold text-text-primary-light dark:text-text-primary-dark mb-3">
          Upcoming Reservations
        </h2>
        <div className="space-y-2">
          {mockReservations.map((res) => (
            <ReservationItem
              key={res.id}
              reservation={res}
              onAccept={() => {}}
              onReassign={() => {}}
            />
          ))}
        </div>
      </section>

      {/* AI Demand Forecast */}
      <section>
        <h2 className="text-base font-heading font-semibold text-text-primary-light dark:text-text-primary-dark mb-3">
          AI Demand Forecast
        </h2>
        {/* Chart placeholder */}
        <div className="rounded-card bg-surface-light dark:bg-surface-dark shadow-soft p-4">
          <div className="h-48 flex items-center justify-center border border-dashed border-border-light dark:border-border-dark rounded-button mb-4">
            <div className="text-center">
              <svg className="w-10 h-10 mx-auto text-text-secondary-light dark:text-text-secondary-dark mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
              </svg>
              <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
                Demand forecast chart (next 6 hours)
              </p>
            </div>
          </div>
          {/* Recommendation Banner */}
          <div className="flex items-center gap-3 p-3 rounded-button bg-primary/5 dark:bg-primary/10 border border-primary/20">
            <svg className="w-5 h-5 text-primary flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <p className="text-sm text-text-primary-light dark:text-text-primary-dark">
              <span className="font-medium">AI Recommendation:</span> Peak demand expected at 4:00 PM. Consider charging 2 additional batteries before 3:30 PM.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
