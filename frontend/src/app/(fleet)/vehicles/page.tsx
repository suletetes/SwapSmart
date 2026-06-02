'use client';

import React, { useState } from 'react';

type ViewState = 'loading' | 'default' | 'empty' | 'error';
type VehicleStatus = 'Active' | 'Idle' | 'Charging' | 'Maintenance';

interface Vehicle {
  id: string;
  registration: string;
  driver: string | null;
  batteryLevel: number;
  location: string;
  status: VehicleStatus;
  healthScore: number;
  lastSwap: string;
}

const MOCK_VEHICLES: Vehicle[] = [
  { id: 'KK-001', registration: 'LAG-234-KK', driver: 'Adamu Musa', batteryLevel: 85, location: 'Ikeja', status: 'Active', healthScore: 94, lastSwap: '2h ago' },
  { id: 'KK-002', registration: 'LAG-567-KK', driver: 'Bola Tinubu', batteryLevel: 62, location: 'Surulere', status: 'Active', healthScore: 88, lastSwap: '4h ago' },
  { id: 'KK-003', registration: 'LAG-890-KK', driver: 'Chidi Okafor', batteryLevel: 45, location: 'Yaba', status: 'Idle', healthScore: 91, lastSwap: '6h ago' },
  { id: 'KK-004', registration: 'LAG-123-KK', driver: 'Danladi Ibrahim', batteryLevel: 91, location: 'Lekki', status: 'Active', healthScore: 96, lastSwap: '1h ago' },
  { id: 'KK-005', registration: 'LAG-456-KK', driver: 'Emeka Nwosu', batteryLevel: 28, location: 'Mushin', status: 'Active', healthScore: 82, lastSwap: '3h ago' },
  { id: 'KK-006', registration: 'LAG-789-KK', driver: 'Fatima Abubakar', batteryLevel: 100, location: 'VI Station', status: 'Charging', healthScore: 90, lastSwap: '30m ago' },
  { id: 'KK-007', registration: 'LAG-012-KK', driver: 'Garba Shehu', batteryLevel: 12, location: 'Oshodi', status: 'Active', healthScore: 75, lastSwap: '5h ago' },
  { id: 'KK-008', registration: 'LAG-345-KK', driver: null, batteryLevel: 0, location: 'Depot', status: 'Maintenance', healthScore: 65, lastSwap: '2d ago' },
];

function getStatusStyle(status: VehicleStatus): string {
  const styles: Record<VehicleStatus, string> = {
    Active: 'bg-primary/10 text-primary',
    Idle: 'bg-warning/10 text-warning',
    Charging: 'bg-blue-500/10 text-blue-500',
    Maintenance: 'bg-error/10 text-error',
  };
  return styles[status];
}

function getBatteryColor(level: number): string {
  if (level <= 20) return 'text-error';
  if (level <= 40) return 'text-warning';
  return 'text-primary';
}

export default function VehiclesPage() {
  const [viewState, setViewState] = useState<ViewState>('default');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  if (viewState === 'loading') {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="h-8 bg-border-light dark:bg-border-dark rounded w-48 animate-pulse" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-16 bg-surface-light dark:bg-surface-dark rounded-card animate-pulse" />
        ))}
      </div>
    );
  }

  if (viewState === 'empty') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center animate-fade-in">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <span className="text-2xl">🚗</span>
        </div>
        <h2 className="font-heading font-bold text-lg text-text-primary-light dark:text-text-primary-dark mb-2">No Vehicles</h2>
        <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark max-w-sm">
          Add vehicles to your fleet to start tracking them.
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
        <h2 className="font-heading font-bold text-lg text-text-primary-light dark:text-text-primary-dark mb-2">Failed to Load Vehicles</h2>
        <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark max-w-sm mb-6">Please try again.</p>
        <button onClick={() => setViewState('default')} className="min-h-[44px] px-6 bg-primary text-white rounded-button font-medium text-sm">Retry</button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading font-bold text-xl text-text-primary-light dark:text-text-primary-dark">Vehicles</h1>
          <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark mt-1">{MOCK_VEHICLES.length} vehicles in fleet</p>
        </div>
        <button className="min-h-[44px] px-4 bg-primary text-white rounded-button text-sm font-medium hover:bg-primary/90 transition-colors">
          + Add Vehicle
        </button>
      </div>

      {/* Vehicle Table */}
      <div className="bg-surface-light dark:bg-surface-dark rounded-card shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-light dark:border-border-dark">
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary-light dark:text-text-secondary-dark uppercase">Vehicle ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary-light dark:text-text-secondary-dark uppercase">Driver</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary-light dark:text-text-secondary-dark uppercase">Battery</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary-light dark:text-text-secondary-dark uppercase">Location</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary-light dark:text-text-secondary-dark uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-text-secondary-light dark:text-text-secondary-dark uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-light dark:divide-border-dark">
              {MOCK_VEHICLES.map((vehicle) => (
                <tr key={vehicle.id} className="hover:bg-primary/5 transition-colors">
                  <td className="px-4 py-3">
                    <div>
                      <span className="font-medium text-text-primary-light dark:text-text-primary-dark">{vehicle.id}</span>
                      <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark">{vehicle.registration}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-text-primary-light dark:text-text-primary-dark">
                    {vehicle.driver || <span className="text-text-secondary-light dark:text-text-secondary-dark italic">Unassigned</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`font-medium ${getBatteryColor(vehicle.batteryLevel)}`}>{vehicle.batteryLevel}%</span>
                  </td>
                  <td className="px-4 py-3 text-text-secondary-light dark:text-text-secondary-dark">{vehicle.location}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusStyle(vehicle.status)}`}>{vehicle.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => { setSelectedVehicle(vehicle); setShowAssignModal(true); }}
                      className="min-h-[44px] min-w-[44px] px-3 text-xs text-primary hover:bg-primary/10 rounded-button transition-colors"
                    >
                      Assign
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Assign/Reassign Driver Modal */}
      {showAssignModal && selectedVehicle && (
        <div className="fixed inset-0 z-modal flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="assign-modal-title">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowAssignModal(false)} />
          <div className="relative bg-surface-light dark:bg-surface-dark rounded-card p-6 w-full max-w-md shadow-elevated animate-slide-up">
            <h2 id="assign-modal-title" className="font-heading font-bold text-lg text-text-primary-light dark:text-text-primary-dark mb-4">
              Assign Driver to {selectedVehicle.id}
            </h2>
            <div className="space-y-3 mb-6">
              <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
                Current: {selectedVehicle.driver || 'None'}
              </p>
              <select className="w-full min-h-[44px] px-3 rounded-button border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark text-sm text-text-primary-light dark:text-text-primary-dark" aria-label="Select driver">
                <option value="">Select a driver...</option>
                <option value="adamu">Adamu Musa</option>
                <option value="bola">Bola Tinubu</option>
                <option value="chidi">Chidi Okafor</option>
                <option value="new">+ Add New Driver</option>
              </select>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowAssignModal(false)} className="flex-1 min-h-[44px] px-4 border border-border-light dark:border-border-dark rounded-button text-sm font-medium text-text-primary-light dark:text-text-primary-dark hover:bg-primary/5 transition-colors">
                Cancel
              </button>
              <button onClick={() => setShowAssignModal(false)} className="flex-1 min-h-[44px] px-4 bg-primary text-white rounded-button text-sm font-medium hover:bg-primary/90 transition-colors">
                Assign
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
