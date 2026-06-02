'use client';

import React, { useState } from 'react';

type ViewState = 'loading' | 'default' | 'empty' | 'error';

interface FleetDriver {
  id: string;
  name: string;
  phone: string;
  vehicleId: string | null;
  swapsThisMonth: number;
  rating: number;
  efficiency: number;
  status: 'Active' | 'Off-duty' | 'On-break';
  joinedDate: string;
}

const MOCK_DRIVERS: FleetDriver[] = [
  { id: 'DRV-001', name: 'Adamu Musa', phone: '+234 813 ***4567', vehicleId: 'KK-001', swapsThisMonth: 45, rating: 4.8, efficiency: 94, status: 'Active', joinedDate: 'Jan 2026' },
  { id: 'DRV-002', name: 'Bola Tinubu', phone: '+234 802 ***8901', vehicleId: 'KK-002', swapsThisMonth: 38, rating: 4.5, efficiency: 88, status: 'Active', joinedDate: 'Feb 2026' },
  { id: 'DRV-003', name: 'Chidi Okafor', phone: '+234 905 ***2345', vehicleId: 'KK-003', swapsThisMonth: 32, rating: 4.7, efficiency: 91, status: 'On-break', joinedDate: 'Jan 2026' },
  { id: 'DRV-004', name: 'Danladi Ibrahim', phone: '+234 816 ***6789', vehicleId: 'KK-004', swapsThisMonth: 52, rating: 4.9, efficiency: 96, status: 'Active', joinedDate: 'Dec 2025' },
  { id: 'DRV-005', name: 'Emeka Nwosu', phone: '+234 703 ***0123', vehicleId: 'KK-005', swapsThisMonth: 28, rating: 4.2, efficiency: 82, status: 'Active', joinedDate: 'Mar 2026' },
  { id: 'DRV-006', name: 'Fatima Abubakar', phone: '+234 809 ***4567', vehicleId: 'KK-006', swapsThisMonth: 41, rating: 4.6, efficiency: 90, status: 'Active', joinedDate: 'Jan 2026' },
  { id: 'DRV-007', name: 'Garba Shehu', phone: '+234 814 ***8901', vehicleId: 'KK-007', swapsThisMonth: 35, rating: 4.3, efficiency: 85, status: 'Off-duty', joinedDate: 'Feb 2026' },
];

function getDriverStatusStyle(status: FleetDriver['status']): string {
  const styles = {
    Active: 'bg-primary/10 text-primary',
    'Off-duty': 'bg-text-secondary-light/10 text-text-secondary-light dark:bg-text-secondary-dark/10 dark:text-text-secondary-dark',
    'On-break': 'bg-warning/10 text-warning',
  };
  return styles[status];
}

export default function DriversPage() {
  const [viewState, setViewState] = useState<ViewState>('default');

  if (viewState === 'loading') {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="h-8 bg-border-light dark:bg-border-dark rounded w-40 animate-pulse" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-20 bg-surface-light dark:bg-surface-dark rounded-card animate-pulse" />
        ))}
      </div>
    );
  }

  if (viewState === 'empty') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center animate-fade-in">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <span className="text-2xl">👤</span>
        </div>
        <h2 className="font-heading font-bold text-lg text-text-primary-light dark:text-text-primary-dark mb-2">No Drivers</h2>
        <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark max-w-sm">
          Add drivers to your fleet to assign them vehicles.
        </p>
      </div>
    );
  }

  if (viewState === 'error') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center animate-fade-in" role="alert">
        <div className="w-16 h-16 rounded-full bg-error/10 flex items-center justify-center mb-4">
          <span className="text-error text-2xl">!</span>
        </div>
        <h2 className="font-heading font-bold text-lg text-text-primary-light dark:text-text-primary-dark mb-2">Failed to Load Drivers</h2>
        <button onClick={() => setViewState('default')} className="min-h-[44px] px-6 bg-primary text-white rounded-button font-medium text-sm mt-4">Retry</button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading font-bold text-xl text-text-primary-light dark:text-text-primary-dark">Drivers</h1>
          <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark mt-1">{MOCK_DRIVERS.length} drivers in fleet</p>
        </div>
        <button className="min-h-[44px] px-4 bg-primary text-white rounded-button text-sm font-medium hover:bg-primary/90 transition-colors">
          + Add Driver
        </button>
      </div>

      {/* Driver Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {MOCK_DRIVERS.map((driver) => (
          <div key={driver.id} className="bg-surface-light dark:bg-surface-dark rounded-card p-5 shadow-soft hover:shadow-elevated transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-primary font-bold text-sm">{driver.name.split(' ').map(n => n[0]).join('')}</span>
                </div>
                <div>
                  <h3 className="font-medium text-sm text-text-primary-light dark:text-text-primary-dark">{driver.name}</h3>
                  <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark">{driver.phone}</p>
                </div>
              </div>
              <span className={`px-2 py-1 rounded text-[10px] font-medium ${getDriverStatusStyle(driver.status)}`}>
                {driver.status}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-3">
              <div className="text-center">
                <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark">Swaps</p>
                <p className="font-bold text-sm text-text-primary-light dark:text-text-primary-dark">{driver.swapsThisMonth}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark">Rating</p>
                <p className="font-bold text-sm text-text-primary-light dark:text-text-primary-dark">⭐ {driver.rating}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark">Efficiency</p>
                <p className={`font-bold text-sm ${driver.efficiency >= 90 ? 'text-primary' : 'text-warning'}`}>{driver.efficiency}%</p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-border-light dark:border-border-dark">
              <span className="text-xs text-text-secondary-light dark:text-text-secondary-dark">
                Vehicle: <span className="font-medium text-text-primary-light dark:text-text-primary-dark">{driver.vehicleId || 'Unassigned'}</span>
              </span>
              <span className="text-xs text-text-secondary-light dark:text-text-secondary-dark">Since {driver.joinedDate}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
