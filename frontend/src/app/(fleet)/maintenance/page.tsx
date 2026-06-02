'use client';

import React, { useState } from 'react';

type ViewState = 'loading' | 'default' | 'empty' | 'error';
type MaintenanceUrgency = 'NONE' | 'MONITOR' | 'SCHEDULE' | 'URGENT';

interface VehicleMaintenance {
  vehicleId: string;
  driver: string;
  batteryId: string;
  healthScore: number;
  cycleCount: number;
  temperature: number;
  voltage: number;
  urgency: MaintenanceUrgency;
  recommendation: string;
  lastChecked: string;
}

const MOCK_MAINTENANCE: VehicleMaintenance[] = [
  { vehicleId: 'KK-007', driver: 'Garba Shehu', batteryId: 'BAT-047', healthScore: 62, cycleCount: 890, temperature: 42, voltage: 48.2, urgency: 'URGENT', recommendation: 'Battery replacement recommended — high cycle count and elevated temperature', lastChecked: '1h ago' },
  { vehicleId: 'KK-008', driver: 'Hassan Yusuf', batteryId: 'BAT-023', healthScore: 68, cycleCount: 750, temperature: 38, voltage: 49.1, urgency: 'SCHEDULE', recommendation: 'Schedule maintenance within 2 weeks — declining health trend', lastChecked: '3h ago' },
  { vehicleId: 'KK-005', driver: 'Emeka Nwosu', batteryId: 'BAT-031', healthScore: 75, cycleCount: 620, temperature: 35, voltage: 50.3, urgency: 'MONITOR', recommendation: 'Monitor voltage levels — slight decline detected', lastChecked: '2h ago' },
  { vehicleId: 'KK-003', driver: 'Chidi Okafor', batteryId: 'BAT-015', healthScore: 82, cycleCount: 480, temperature: 33, voltage: 51.0, urgency: 'MONITOR', recommendation: 'Normal wear — continue monitoring', lastChecked: '4h ago' },
  { vehicleId: 'KK-001', driver: 'Adamu Musa', batteryId: 'BAT-008', healthScore: 91, cycleCount: 320, temperature: 31, voltage: 51.8, urgency: 'NONE', recommendation: 'Battery in excellent condition', lastChecked: '1h ago' },
  { vehicleId: 'KK-004', driver: 'Danladi Ibrahim', batteryId: 'BAT-052', healthScore: 94, cycleCount: 210, temperature: 30, voltage: 52.0, urgency: 'NONE', recommendation: 'Battery in excellent condition', lastChecked: '2h ago' },
];

function getUrgencyStyle(urgency: MaintenanceUrgency) {
  const styles: Record<MaintenanceUrgency, { bg: string; text: string; label: string }> = {
    URGENT: { bg: 'bg-error/10', text: 'text-error', label: 'Urgent' },
    SCHEDULE: { bg: 'bg-warning/10', text: 'text-warning', label: 'Schedule' },
    MONITOR: { bg: 'bg-blue-500/10', text: 'text-blue-500', label: 'Monitor' },
    NONE: { bg: 'bg-primary/10', text: 'text-primary', label: 'Good' },
  };
  return styles[urgency];
}

function getHealthColor(score: number): string {
  if (score >= 85) return 'text-primary';
  if (score >= 70) return 'text-warning';
  return 'text-error';
}

function HealthGauge({ score }: { score: number }) {
  const color = score >= 85 ? 'text-primary' : score >= 70 ? 'text-warning' : 'text-error';
  return (
    <div className="relative w-10 h-10">
      <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
        <path
          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          fill="none" stroke="currentColor" strokeWidth="3"
          className="text-border-light dark:text-border-dark"
        />
        <path
          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          fill="none" stroke="currentColor" strokeWidth="3"
          strokeDasharray={`${score}, 100`}
          className={color}
        />
      </svg>
      <span className={`absolute inset-0 flex items-center justify-center text-[9px] font-bold ${color}`}>
        {score}
      </span>
    </div>
  );
}

export default function MaintenancePage() {
  const [viewState, setViewState] = useState<ViewState>('default');

  const urgentCount = MOCK_MAINTENANCE.filter(m => m.urgency === 'URGENT').length;
  const scheduleCount = MOCK_MAINTENANCE.filter(m => m.urgency === 'SCHEDULE').length;

  if (viewState === 'loading') {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="h-8 bg-border-light dark:bg-border-dark rounded w-48 animate-pulse" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 bg-surface-light dark:bg-surface-dark rounded-card animate-pulse" />
        ))}
      </div>
    );
  }

  if (viewState === 'empty') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center animate-fade-in">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <span className="text-2xl">🔧</span>
        </div>
        <h2 className="font-heading font-bold text-lg text-text-primary-light dark:text-text-primary-dark mb-2">No Maintenance Data</h2>
        <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark max-w-sm">
          Battery health data will appear once vehicles start operating.
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
        <h2 className="font-heading font-bold text-lg text-text-primary-light dark:text-text-primary-dark mb-2">Failed to Load Maintenance Data</h2>
        <button onClick={() => setViewState('default')} className="min-h-[44px] px-6 bg-primary text-white rounded-button font-medium text-sm mt-4">Retry</button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-heading font-bold text-xl text-text-primary-light dark:text-text-primary-dark">Maintenance</h1>
        <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark mt-1">Battery health monitoring and recommendations</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-error/5 border border-error/20 rounded-card p-4">
          <p className="text-xs text-error font-medium uppercase">Urgent</p>
          <p className="font-heading font-bold text-2xl text-error mt-1">{urgentCount}</p>
          <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark mt-1">Needs immediate attention</p>
        </div>
        <div className="bg-warning/5 border border-warning/20 rounded-card p-4">
          <p className="text-xs text-warning font-medium uppercase">Scheduled</p>
          <p className="font-heading font-bold text-2xl text-warning mt-1">{scheduleCount}</p>
          <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark mt-1">Maintenance due soon</p>
        </div>
        <div className="bg-primary/5 border border-primary/20 rounded-card p-4">
          <p className="text-xs text-primary font-medium uppercase">Fleet Avg Health</p>
          <p className="font-heading font-bold text-2xl text-primary mt-1">
            {Math.round(MOCK_MAINTENANCE.reduce((s, m) => s + m.healthScore, 0) / MOCK_MAINTENANCE.length)}%
          </p>
          <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark mt-1">Across all vehicles</p>
        </div>
      </div>

      {/* Maintenance List */}
      <div className="space-y-3">
        {MOCK_MAINTENANCE.map((item) => {
          const urgencyStyle = getUrgencyStyle(item.urgency);
          return (
            <div key={item.vehicleId} className={`bg-surface-light dark:bg-surface-dark rounded-card p-4 shadow-soft border-l-4 ${item.urgency === 'URGENT' ? 'border-l-error' : item.urgency === 'SCHEDULE' ? 'border-l-warning' : item.urgency === 'MONITOR' ? 'border-l-blue-500' : 'border-l-primary'}`}>
              <div className="flex items-start gap-4">
                <HealthGauge score={item.healthScore} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm text-text-primary-light dark:text-text-primary-dark">{item.vehicleId}</span>
                    <span className="text-xs text-text-secondary-light dark:text-text-secondary-dark">• {item.driver}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${urgencyStyle.bg} ${urgencyStyle.text}`}>
                      {urgencyStyle.label}
                    </span>
                  </div>
                  <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark mt-1">{item.recommendation}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-text-secondary-light dark:text-text-secondary-dark">
                    <span>Cycles: {item.cycleCount}</span>
                    <span>Temp: {item.temperature}°C</span>
                    <span>Voltage: {item.voltage}V</span>
                    <span>Checked: {item.lastChecked}</span>
                  </div>
                </div>
                {(item.urgency === 'URGENT' || item.urgency === 'SCHEDULE') && (
                  <button className="min-h-[44px] min-w-[44px] px-3 text-xs font-medium text-primary bg-primary/10 rounded-button hover:bg-primary/20 transition-colors whitespace-nowrap">
                    Schedule
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
