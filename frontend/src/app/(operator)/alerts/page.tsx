'use client';

import React, { useState } from 'react';
import { SkeletonLoader } from '@/components/ui/SkeletonLoader';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';

// --- Types ---
type AlertSeverity = 'critical' | 'warning' | 'info';
type AlertFilter = 'all' | AlertSeverity;

interface Alert {
  id: string;
  severity: AlertSeverity;
  title: string;
  description: string;
  timestamp: string;
  resolved: boolean;
}

// --- Mock Data ---
const mockAlerts: Alert[] = [
  { id: 'alert-1', severity: 'critical', title: 'Battery BAT-006 overheating', description: 'Temperature exceeded 45°C threshold. Charging paused automatically.', timestamp: '2 min ago', resolved: false },
  { id: 'alert-2', severity: 'critical', title: 'Power outage detected', description: 'Grid power lost. Solar backup active. Estimated 2h remaining.', timestamp: '15 min ago', resolved: false },
  { id: 'alert-3', severity: 'warning', title: 'BAT-010 health declining', description: 'Health score dropped to 72%. Schedule maintenance recommended.', timestamp: '1h ago', resolved: false },
  { id: 'alert-4', severity: 'warning', title: 'High demand period approaching', description: 'AI predicts 3x normal demand between 4-6 PM. Only 5 batteries ready.', timestamp: '2h ago', resolved: false },
  { id: 'alert-5', severity: 'info', title: 'Firmware update available', description: 'Station controller firmware v2.4.1 available. Schedule update during off-peak.', timestamp: '4h ago', resolved: false },
  { id: 'alert-6', severity: 'info', title: 'Monthly report ready', description: 'June performance report has been generated and is ready for download.', timestamp: '6h ago', resolved: true },
];

// --- Sub-components ---

function AlertCard({ alert, onResolve, onDismiss }: {
  alert: Alert;
  onResolve: () => void;
  onDismiss: () => void;
}) {
  const severityConfig: Record<AlertSeverity, { border: string; bg: string; icon: string }> = {
    critical: { border: 'border-l-error', bg: 'bg-error/5 dark:bg-error/10', icon: 'text-error' },
    warning: { border: 'border-l-warning', bg: 'bg-warning/5 dark:bg-warning/10', icon: 'text-warning' },
    info: { border: 'border-l-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/10', icon: 'text-blue-500' },
  };

  const { border, bg, icon } = severityConfig[alert.severity];

  return (
    <div className={`p-4 rounded-card border-l-4 ${border} ${bg} ${alert.resolved ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className={`flex-shrink-0 mt-0.5 ${icon}`}>
            {alert.severity === 'critical' ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            ) : alert.severity === 'warning' ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-medium text-text-primary-light dark:text-text-primary-dark">
                {alert.title}
              </h3>
              {alert.resolved && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-success/10 text-success">
                  Resolved
                </span>
              )}
            </div>
            <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark mt-1">
              {alert.description}
            </p>
            <p className="text-[10px] text-text-secondary-light dark:text-text-secondary-dark mt-1">
              {alert.timestamp}
            </p>
          </div>
        </div>
      </div>

      {!alert.resolved && (
        <div className="mt-3 flex items-center gap-2 ml-8">
          <button
            onClick={onResolve}
            className="min-h-[44px] min-w-[44px] px-3 py-2 text-xs font-medium rounded-button
              bg-primary text-white hover:bg-primary/90
              focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2
              transition-colors duration-fast"
          >
            Resolve
          </button>
          <button
            onClick={onDismiss}
            className="min-h-[44px] min-w-[44px] px-3 py-2 text-xs font-medium rounded-button
              border border-border-light dark:border-border-dark
              text-text-secondary-light dark:text-text-secondary-dark
              hover:bg-gray-50 dark:hover:bg-gray-800
              focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2
              transition-colors duration-fast"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}

// --- Main Page ---
export default function AlertsPage() {
  const [filter, setFilter] = useState<AlertFilter>('all');
  const [alerts, setAlerts] = useState(mockAlerts);
  const [loading] = useState(false);
  const [error, setError] = useState(false);

  if (loading) {
    return (
      <div className="p-4 lg:p-6 space-y-4" aria-busy="true" aria-label="Loading alerts">
        <SkeletonLoader variant="text" width="150px" height="28px" />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-4 rounded-card bg-surface-light dark:bg-surface-dark shadow-soft">
              <SkeletonLoader variant="text" width="70%" />
              <SkeletonLoader variant="text" width="90%" className="mt-2" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) return <ErrorState message="Failed to load alerts" onRetry={() => setError(false)} />;

  const filteredAlerts = filter === 'all' ? alerts : alerts.filter(a => a.severity === filter);

  // Sort by severity: critical > warning > info
  const severityOrder: Record<AlertSeverity, number> = { critical: 0, warning: 1, info: 2 };
  const sortedAlerts = [...filteredAlerts].sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  const filterChips: { key: AlertFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'critical', label: 'Critical' },
    { key: 'warning', label: 'Warning' },
    { key: 'info', label: 'Info' },
  ];

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <h1 className="text-xl font-heading font-bold text-text-primary-light dark:text-text-primary-dark">
        Alerts
      </h1>

      {/* Filter Chips */}
      <div className="flex flex-wrap gap-2">
        {filterChips.map((chip) => (
          <button
            key={chip.key}
            onClick={() => setFilter(chip.key)}
            className={`min-h-[44px] px-4 py-2 text-xs font-medium rounded-button transition-colors duration-fast
              focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2
              ${filter === chip.key
                ? 'bg-primary text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-text-secondary-light dark:text-text-secondary-dark hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* Alerts List */}
      {sortedAlerts.length === 0 ? (
        <EmptyState
          message="No alerts"
          description={filter === 'all' ? 'Everything is running smoothly.' : `No ${filter} alerts at this time.`}
        />
      ) : (
        <div className="space-y-3">
          {sortedAlerts.map((alert) => (
            <AlertCard
              key={alert.id}
              alert={alert}
              onResolve={() => setAlerts(prev => prev.map(a => a.id === alert.id ? { ...a, resolved: true } : a))}
              onDismiss={() => setAlerts(prev => prev.filter(a => a.id !== alert.id))}
            />
          ))}
        </div>
      )}
    </div>
  );
}
