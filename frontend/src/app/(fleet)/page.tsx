'use client';

import React, { useState } from 'react';

type ViewState = 'loading' | 'default' | 'empty' | 'error';
type VehicleStatus = 'Active' | 'Idle' | 'Charging';

interface FleetVehicle {
  id: string;
  driver: string;
  batteryLevel: number;
  location: string;
  status: VehicleStatus;
  lat: number;
  lng: number;
}

const MOCK_VEHICLES: FleetVehicle[] = [
  { id: 'KK-001', driver: 'Adamu Musa', batteryLevel: 85, location: 'Ikeja', status: 'Active', lat: 6.6018, lng: 3.3515 },
  { id: 'KK-002', driver: 'Bola Tinubu', batteryLevel: 62, location: 'Surulere', status: 'Active', lat: 6.5059, lng: 3.3509 },
  { id: 'KK-003', driver: 'Chidi Okafor', batteryLevel: 45, location: 'Yaba', status: 'Idle', lat: 6.5095, lng: 3.3711 },
  { id: 'KK-004', driver: 'Danladi Ibrahim', batteryLevel: 91, location: 'Lekki', status: 'Active', lat: 6.4698, lng: 3.5852 },
  { id: 'KK-005', driver: 'Emeka Nwosu', batteryLevel: 28, location: 'Mushin', status: 'Active', lat: 6.5355, lng: 3.3487 },
  { id: 'KK-006', driver: 'Fatima Abubakar', batteryLevel: 100, location: 'VI Station', status: 'Charging', lat: 6.4281, lng: 3.4219 },
  { id: 'KK-007', driver: 'Garba Shehu', batteryLevel: 12, location: 'Oshodi', status: 'Active', lat: 6.5569, lng: 3.3413 },
  { id: 'KK-008', driver: 'Hassan Yusuf', batteryLevel: 73, location: 'Ajah', status: 'Active', lat: 6.4676, lng: 3.5714 },
  { id: 'KK-009', driver: 'Ibrahim Kano', batteryLevel: 55, location: 'Ikorodu', status: 'Idle', lat: 6.6194, lng: 3.5105 },
  { id: 'KK-010', driver: 'Joseph Ade', batteryLevel: 38, location: 'Apapa', status: 'Active', lat: 6.4488, lng: 3.3590 },
  { id: 'KK-011', driver: 'Kunle Bayo', batteryLevel: 67, location: 'Ojota', status: 'Active', lat: 6.5833, lng: 3.3833 },
  { id: 'KK-012', driver: 'Lawal Sani', batteryLevel: 82, location: 'Maryland', status: 'Active', lat: 6.5714, lng: 3.3643 },
];

const LOW_BATTERY_THRESHOLD = 20;

function getBatteryColor(level: number): string {
  if (level <= 20) return 'text-error';
  if (level <= 40) return 'text-warning';
  return 'text-primary';
}

function getBatteryBg(level: number): string {
  if (level <= 20) return 'bg-error';
  if (level <= 40) return 'bg-warning';
  return 'bg-primary';
}

function getStatusBadge(status: VehicleStatus) {
  const styles: Record<VehicleStatus, string> = {
    Active: 'bg-primary/10 text-primary',
    Idle: 'bg-warning/10 text-warning',
    Charging: 'bg-blue-500/10 text-blue-500',
  };
  return styles[status];
}

function SkeletonCard() {
  return (
    <div className="bg-surface-light dark:bg-surface-dark rounded-card p-5 animate-pulse">
      <div className="h-4 bg-border-light dark:bg-border-dark rounded w-24 mb-3" />
      <div className="h-8 bg-border-light dark:bg-border-dark rounded w-16" />
    </div>
  );
}

function SkeletonMap() {
  return (
    <div className="bg-surface-light dark:bg-surface-dark rounded-card h-[400px] animate-pulse flex items-center justify-center">
      <div className="text-text-secondary-light dark:text-text-secondary-dark text-sm">Loading map...</div>
    </div>
  );
}

export default function FleetOverviewPage() {
  const [viewState, setViewState] = useState<ViewState>('default');
  const [sortBy, setSortBy] = useState<'battery' | 'name'>('battery');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const sortedVehicles = [...MOCK_VEHICLES].sort((a, b) => {
    if (sortBy === 'battery') {
      return sortDir === 'asc' ? a.batteryLevel - b.batteryLevel : b.batteryLevel - a.batteryLevel;
    }
    return sortDir === 'asc' ? a.id.localeCompare(b.id) : b.id.localeCompare(a.id);
  });

  const lowBatteryVehicles = MOCK_VEHICLES.filter((v) => v.batteryLevel <= LOW_BATTERY_THRESHOLD);
  const activeCount = MOCK_VEHICLES.filter((v) => v.status === 'Active').length;
  const totalCount = MOCK_VEHICLES.length + 3; // 12 active + 3 inactive (15 total)
  const avgHealth = 91;
  const totalSwapsToday = 28;
  const fuelSavings = 54000;

  if (viewState === 'loading') {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
        <SkeletonMap />
      </div>
    );
  }

  if (viewState === 'empty') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center animate-fade-in">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <VehicleEmptyIcon className="w-8 h-8 text-primary" />
        </div>
        <h2 className="font-heading font-bold text-lg text-text-primary-light dark:text-text-primary-dark mb-2">
          No Vehicles Yet
        </h2>
        <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark max-w-sm mb-6">
          Add vehicles to your fleet to start tracking battery levels, locations, and savings.
        </p>
        <button className="min-h-[44px] px-6 bg-primary text-white rounded-button font-medium text-sm hover:bg-primary/90 transition-colors">
          Add First Vehicle
        </button>
      </div>
    );
  }

  if (viewState === 'error') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center animate-fade-in" role="alert" aria-live="assertive">
        <div className="w-16 h-16 rounded-full bg-error/10 flex items-center justify-center mb-4">
          <span className="text-error text-2xl">!</span>
        </div>
        <h2 className="font-heading font-bold text-lg text-text-primary-light dark:text-text-primary-dark mb-2">
          Failed to Load Fleet Data
        </h2>
        <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark max-w-sm mb-6">
          We couldn&apos;t fetch your fleet information. Please check your connection and try again.
        </p>
        <button
          onClick={() => setViewState('default')}
          className="min-h-[44px] px-6 bg-primary text-white rounded-button font-medium text-sm hover:bg-primary/90 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading font-bold text-xl text-text-primary-light dark:text-text-primary-dark">
            Fleet Overview
          </h1>
          <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark mt-1">
            Real-time fleet monitoring and analytics
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            Live
          </span>
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Vehicles */}
        <div className="bg-surface-light dark:bg-surface-dark rounded-card p-5 shadow-soft">
          <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark font-medium uppercase tracking-wide">
            Active Vehicles
          </p>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="font-heading font-bold text-2xl text-text-primary-light dark:text-text-primary-dark">
              {activeCount}
            </span>
            <span className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
              /{totalCount}
            </span>
          </div>
          <div className="mt-2 w-full h-2 bg-border-light dark:bg-border-dark rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full" style={{ width: `${(activeCount / totalCount) * 100}%` }} />
          </div>
        </div>

        {/* Total Swaps Today */}
        <div className="bg-surface-light dark:bg-surface-dark rounded-card p-5 shadow-soft">
          <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark font-medium uppercase tracking-wide">
            Total Swaps Today
          </p>
          <div className="mt-2">
            <span className="font-heading font-bold text-2xl text-text-primary-light dark:text-text-primary-dark">
              {totalSwapsToday}
            </span>
          </div>
          <p className="mt-2 text-xs text-primary font-medium">↑ 12% from yesterday</p>
        </div>

        {/* Fleet Battery Health */}
        <div className="bg-surface-light dark:bg-surface-dark rounded-card p-5 shadow-soft">
          <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark font-medium uppercase tracking-wide">
            Fleet Battery Health
          </p>
          <div className="mt-2 flex items-center gap-3">
            <div className="relative w-12 h-12">
              <svg className="w-12 h-12 -rotate-90" viewBox="0 0 36 36">
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  className="text-border-light dark:text-border-dark"
                />
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeDasharray={`${avgHealth}, 100`}
                  className="text-primary"
                />
              </svg>
            </div>
            <span className="font-heading font-bold text-2xl text-text-primary-light dark:text-text-primary-dark">
              {avgHealth}<span className="text-sm text-text-secondary-light dark:text-text-secondary-dark">/100</span>
            </span>
          </div>
        </div>

        {/* Fuel Savings */}
        <div className="bg-surface-light dark:bg-surface-dark rounded-card p-5 shadow-soft">
          <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark font-medium uppercase tracking-wide">
            Today&apos;s Fuel Savings
          </p>
          <div className="mt-2">
            <span className="font-heading font-bold text-2xl text-primary">
              ₦{fuelSavings.toLocaleString()}
            </span>
          </div>
          <p className="mt-2 text-xs text-text-secondary-light dark:text-text-secondary-dark">
            vs petrol equivalent
          </p>
        </div>
      </div>

      {/* Map + Vehicle List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Live Fleet Map */}
        <div className="lg:col-span-2 bg-surface-light dark:bg-surface-dark rounded-card shadow-soft overflow-hidden">
          <div className="px-5 py-4 border-b border-border-light dark:border-border-dark flex items-center justify-between">
            <h2 className="font-heading font-bold text-base text-text-primary-light dark:text-text-primary-dark">
              Live Fleet Map
            </h2>
            <span className="text-xs text-text-secondary-light dark:text-text-secondary-dark">
              Lagos, Nigeria
            </span>
          </div>
          <div className="relative h-[400px] bg-secondary/5 dark:bg-secondary/20 flex items-center justify-center">
            {/* Placeholder map with vehicle markers */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-blue-500/5" />
            <div className="relative w-full h-full p-4">
              {/* Simulated map markers */}
              {MOCK_VEHICLES.map((vehicle) => {
                const x = ((vehicle.lng - 3.3) / 0.35) * 100;
                const y = ((6.65 - vehicle.lat) / 0.25) * 100;
                return (
                  <div
                    key={vehicle.id}
                    className="absolute transform -translate-x-1/2 -translate-y-1/2 group"
                    style={{ left: `${Math.min(Math.max(x, 5), 95)}%`, top: `${Math.min(Math.max(y, 5), 95)}%` }}
                  >
                    <div className={`w-6 h-6 rounded-full ${getBatteryBg(vehicle.batteryLevel)} flex items-center justify-center shadow-elevated cursor-pointer`}>
                      <span className="text-white text-[8px] font-bold">{vehicle.batteryLevel}</span>
                    </div>
                    <div className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-secondary text-white text-[10px] rounded whitespace-nowrap z-popover">
                      {vehicle.id} • {vehicle.driver}
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Map legend */}
            <div className="absolute bottom-3 left-3 bg-surface-light/90 dark:bg-surface-dark/90 backdrop-blur-sm rounded-lg px-3 py-2 text-[10px] space-y-1">
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-primary" /> &gt;40%</div>
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-warning" /> 21-40%</div>
              <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-error" /> ≤20%</div>
            </div>
          </div>
        </div>

        {/* Vehicle List */}
        <div className="bg-surface-light dark:bg-surface-dark rounded-card shadow-soft overflow-hidden">
          <div className="px-5 py-4 border-b border-border-light dark:border-border-dark flex items-center justify-between">
            <h2 className="font-heading font-bold text-base text-text-primary-light dark:text-text-primary-dark">
              Vehicles
            </h2>
            <button
              onClick={() => {
                setSortBy('battery');
                setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
              }}
              className="min-h-[44px] min-w-[44px] flex items-center gap-1 px-2 text-xs text-text-secondary-light dark:text-text-secondary-dark hover:text-primary transition-colors"
              aria-label="Sort by battery level"
            >
              Battery {sortDir === 'asc' ? '↑' : '↓'}
            </button>
          </div>
          <div className="divide-y divide-border-light dark:divide-border-dark max-h-[400px] overflow-y-auto">
            {sortedVehicles.map((vehicle) => (
              <div key={vehicle.id} className="px-4 py-3 flex items-center gap-3 hover:bg-primary/5 transition-colors">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-[10px] font-bold ${getBatteryBg(vehicle.batteryLevel)}`}>
                  {vehicle.batteryLevel}%
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-text-primary-light dark:text-text-primary-dark">
                      {vehicle.id}
                    </span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${getStatusBadge(vehicle.status)}`}>
                      {vehicle.status}
                    </span>
                  </div>
                  <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark truncate">
                    {vehicle.driver} • {vehicle.location}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Low Battery Alerts */}
      {lowBatteryVehicles.length > 0 && (
        <div className="bg-error/5 border border-error/20 rounded-card p-4">
          <h3 className="font-heading font-bold text-sm text-error mb-3 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-error/20 flex items-center justify-center text-[10px]">⚠</span>
            Low Battery Alerts
          </h3>
          <div className="space-y-2">
            {lowBatteryVehicles.map((vehicle) => (
              <div key={vehicle.id} className="flex items-center gap-3 text-sm" role="alert">
                <span className="text-error font-medium">{vehicle.id}</span>
                <span className="text-text-secondary-light dark:text-text-secondary-dark">
                  battery at {vehicle.batteryLevel}% — nearest station: Yaba Hub
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function VehicleEmptyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
    </svg>
  );
}
