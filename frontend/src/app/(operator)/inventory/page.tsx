'use client';

import React, { useState } from 'react';
import { SkeletonLoader } from '@/components/ui/SkeletonLoader';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';

// --- Types ---
type BatteryStatus = 'Ready' | 'Charging' | 'Reserved' | 'Depleted' | 'Maintenance';

interface Battery {
  slotNumber: number;
  batteryId: string;
  chargePercent: number;
  status: BatteryStatus;
  healthScore: number;
  cycleCount: number;
  lastSwap: string;
}

type ViewMode = 'grid' | 'list';
type FilterStatus = 'All' | BatteryStatus;

// --- Mock Data ---
const mockBatteries: Battery[] = [
  { slotNumber: 1, batteryId: 'BAT-001', chargePercent: 100, status: 'Ready', healthScore: 94, cycleCount: 127, lastSwap: '2h ago' },
  { slotNumber: 2, batteryId: 'BAT-002', chargePercent: 100, status: 'Ready', healthScore: 89, cycleCount: 203, lastSwap: '4h ago' },
  { slotNumber: 3, batteryId: 'BAT-003', chargePercent: 78, status: 'Charging', healthScore: 91, cycleCount: 156, lastSwap: '1h ago' },
  { slotNumber: 4, batteryId: 'BAT-004', chargePercent: 100, status: 'Ready', healthScore: 96, cycleCount: 89, lastSwap: '30m ago' },
  { slotNumber: 5, batteryId: 'BAT-005', chargePercent: 100, status: 'Reserved', healthScore: 87, cycleCount: 234, lastSwap: '6h ago' },
  { slotNumber: 6, batteryId: 'BAT-006', chargePercent: 45, status: 'Charging', healthScore: 82, cycleCount: 312, lastSwap: '3h ago' },
  { slotNumber: 7, batteryId: 'BAT-007', chargePercent: 100, status: 'Ready', healthScore: 93, cycleCount: 145, lastSwap: '5h ago' },
  { slotNumber: 8, batteryId: 'BAT-008', chargePercent: 100, status: 'Ready', healthScore: 90, cycleCount: 178, lastSwap: '2h ago' },
  { slotNumber: 9, batteryId: 'BAT-009', chargePercent: 100, status: 'Ready', healthScore: 95, cycleCount: 102, lastSwap: '7h ago' },
  { slotNumber: 10, batteryId: 'BAT-010', chargePercent: 100, status: 'Ready', healthScore: 88, cycleCount: 221, lastSwap: '1h ago' },
];

// --- Sub-components ---

function StatusBadge({ status }: { status: BatteryStatus }) {
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

function CircularProgress({ value, size = 48 }: { value: number; size?: number }) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (value / 100) * circumference;
  const color = value >= 80 ? 'text-success' : value >= 40 ? 'text-warning' : 'text-error';

  return (
    <svg className={`-rotate-90 ${color}`} width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" strokeWidth="4"
        className="text-gray-200 dark:text-gray-700" opacity={0.3} />
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" strokeWidth="4"
        strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round" />
    </svg>
  );
}

function BatteryGridCard({ battery, onAction }: { battery: Battery; onAction: (action: string) => void }) {
  return (
    <div className="p-4 rounded-card bg-surface-light dark:bg-surface-dark shadow-soft border border-border-light dark:border-border-dark">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-text-secondary-light dark:text-text-secondary-dark">
          Slot {battery.slotNumber}
        </span>
        <StatusBadge status={battery.status} />
      </div>

      <div className="flex items-center justify-center mb-3">
        <div className="relative">
          <CircularProgress value={battery.chargePercent} size={64} />
          <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-text-primary-light dark:text-text-primary-dark">
            {battery.chargePercent}%
          </span>
        </div>
      </div>

      <p className="text-xs font-mono text-text-primary-light dark:text-text-primary-dark text-center mb-2">
        {battery.batteryId}
      </p>

      <div className="grid grid-cols-2 gap-2 text-[10px] text-text-secondary-light dark:text-text-secondary-dark">
        <div>
          <span className="block font-medium">Health</span>
          <span className={battery.healthScore < 85 ? 'text-warning font-medium' : ''}>{battery.healthScore}%</span>
        </div>
        <div>
          <span className="block font-medium">Cycles</span>
          <span>{battery.cycleCount}</span>
        </div>
      </div>

      {/* Actions */}
      {(battery.status === 'Ready' || battery.status === 'Depleted') && (
        <div className="mt-3 flex gap-2">
          {battery.status === 'Ready' && (
            <button
              onClick={() => onAction('depleted')}
              className="flex-1 min-h-[44px] px-2 py-2 text-[10px] font-medium rounded-button
                border border-border-light dark:border-border-dark
                text-text-secondary-light dark:text-text-secondary-dark
                hover:bg-gray-50 dark:hover:bg-gray-800
                focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2
                transition-colors duration-fast"
            >
              Mark Depleted
            </button>
          )}
          <button
            onClick={() => onAction('maintenance')}
            className="flex-1 min-h-[44px] px-2 py-2 text-[10px] font-medium rounded-button
              border border-warning text-warning
              hover:bg-warning/5
              focus-visible:ring-2 focus-visible:ring-warning focus-visible:ring-offset-2
              transition-colors duration-fast"
          >
            Maintenance
          </button>
        </div>
      )}
    </div>
  );
}

function InventoryListView({ batteries, onAction }: { batteries: Battery[]; onAction: (id: string, action: string) => void }) {
  const [sortKey, setSortKey] = useState<keyof Battery>('slotNumber');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const sorted = [...batteries].sort((a, b) => {
    const aVal = a[sortKey];
    const bVal = b[sortKey];
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
    }
    return sortDir === 'asc'
      ? String(aVal).localeCompare(String(bVal))
      : String(bVal).localeCompare(String(aVal));
  });

  function handleSort(key: keyof Battery) {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  function SortHeader({ label, field }: { label: string; field: keyof Battery }) {
    const active = sortKey === field;
    return (
      <th
        className="px-3 py-2 text-left text-[10px] font-medium text-text-secondary-light dark:text-text-secondary-dark uppercase tracking-wider cursor-pointer hover:text-text-primary-light dark:hover:text-text-primary-dark select-none"
        onClick={() => handleSort(field)}
      >
        <span className="inline-flex items-center gap-1">
          {label}
          {active && <span>{sortDir === 'asc' ? '↑' : '↓'}</span>}
        </span>
      </th>
    );
  }

  return (
    <div className="overflow-x-auto rounded-card bg-surface-light dark:bg-surface-dark shadow-soft">
      <table className="w-full text-sm">
        <thead className="border-b border-border-light dark:border-border-dark">
          <tr>
            <SortHeader label="Slot" field="slotNumber" />
            <SortHeader label="Battery ID" field="batteryId" />
            <SortHeader label="Charge %" field="chargePercent" />
            <SortHeader label="Status" field="status" />
            <SortHeader label="Health" field="healthScore" />
            <SortHeader label="Cycles" field="cycleCount" />
            <SortHeader label="Last Swap" field="lastSwap" />
            <th className="px-3 py-2 text-left text-[10px] font-medium text-text-secondary-light dark:text-text-secondary-dark uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border-light dark:divide-border-dark">
          {sorted.map((battery) => (
            <tr key={battery.batteryId} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
              <td className="px-3 py-3 text-xs text-text-primary-light dark:text-text-primary-dark">
                {battery.slotNumber}
              </td>
              <td className="px-3 py-3 text-xs font-mono text-text-primary-light dark:text-text-primary-dark">
                {battery.batteryId}
              </td>
              <td className="px-3 py-3">
                <div className="flex items-center gap-2">
                  <div className="w-16 h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        battery.chargePercent >= 80 ? 'bg-success' :
                        battery.chargePercent >= 40 ? 'bg-warning' : 'bg-error'
                      }`}
                      style={{ width: `${battery.chargePercent}%` }}
                    />
                  </div>
                  <span className="text-xs text-text-secondary-light dark:text-text-secondary-dark">
                    {battery.chargePercent}%
                  </span>
                </div>
              </td>
              <td className="px-3 py-3"><StatusBadge status={battery.status} /></td>
              <td className="px-3 py-3">
                <span className={`text-xs font-medium ${battery.healthScore < 85 ? 'text-warning' : 'text-text-primary-light dark:text-text-primary-dark'}`}>
                  {battery.healthScore}%
                </span>
              </td>
              <td className="px-3 py-3 text-xs text-text-secondary-light dark:text-text-secondary-dark">
                {battery.cycleCount}
              </td>
              <td className="px-3 py-3 text-xs text-text-secondary-light dark:text-text-secondary-dark">
                {battery.lastSwap}
              </td>
              <td className="px-3 py-3">
                <div className="flex items-center gap-1">
                  {battery.status === 'Ready' && (
                    <button
                      onClick={() => onAction(battery.batteryId, 'depleted')}
                      className="min-h-[44px] min-w-[44px] px-2 py-1 text-[10px] font-medium rounded-button
                        border border-border-light dark:border-border-dark
                        hover:bg-gray-50 dark:hover:bg-gray-800
                        focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2
                        transition-colors duration-fast"
                    >
                      Depleted
                    </button>
                  )}
                  <button
                    onClick={() => onAction(battery.batteryId, 'maintenance')}
                    className="min-h-[44px] min-w-[44px] px-2 py-1 text-[10px] font-medium rounded-button
                      text-warning border border-warning
                      hover:bg-warning/5
                      focus-visible:ring-2 focus-visible:ring-warning focus-visible:ring-offset-2
                      transition-colors duration-fast"
                  >
                    Maint.
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function HealthAlerts({ batteries }: { batteries: Battery[] }) {
  const alerts = batteries.filter(b => b.healthScore < 85);
  if (alerts.length === 0) return null;

  return (
    <section>
      <h2 className="text-base font-heading font-semibold text-text-primary-light dark:text-text-primary-dark mb-3">
        Health Alerts
      </h2>
      <div className="space-y-2">
        {alerts.map((battery) => (
          <div
            key={battery.batteryId}
            className="flex items-center justify-between p-3 rounded-button border-l-4 border-l-warning bg-warning/5 dark:bg-warning/10"
          >
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-warning flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <p className="text-sm font-medium text-text-primary-light dark:text-text-primary-dark">
                  {battery.batteryId} — Health Score: {battery.healthScore}%
                </p>
                <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark">
                  {battery.cycleCount} cycles · Slot {battery.slotNumber}
                </p>
              </div>
            </div>
            <button className="min-h-[44px] min-w-[44px] px-3 py-2 text-xs font-medium rounded-button
              bg-warning/10 text-warning hover:bg-warning/20
              focus-visible:ring-2 focus-visible:ring-warning focus-visible:ring-offset-2
              transition-colors duration-fast">
              Schedule Maintenance
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

// --- Loading Skeleton ---
function InventorySkeleton() {
  return (
    <div className="p-4 lg:p-6 space-y-6" aria-busy="true" aria-label="Loading inventory">
      <SkeletonLoader variant="text" width="200px" height="28px" />
      <div className="flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonLoader key={i} variant="rounded" width="80px" height="36px" />
        ))}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="p-4 rounded-card bg-surface-light dark:bg-surface-dark shadow-soft">
            <SkeletonLoader variant="circular" width="64px" height="64px" className="mx-auto mb-2" />
            <SkeletonLoader variant="text" width="80%" className="mx-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Main Page ---
export default function InventoryPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [filter, setFilter] = useState<FilterStatus>('All');
  const [loading] = useState(false);
  const [error, setError] = useState(false);

  if (loading) return <InventorySkeleton />;
  if (error) return <ErrorState message="Failed to load inventory" onRetry={() => setError(false)} />;

  const filteredBatteries = filter === 'All'
    ? mockBatteries
    : mockBatteries.filter(b => b.status === filter);

  const statusCounts: Record<FilterStatus, number> = {
    All: mockBatteries.length,
    Ready: mockBatteries.filter(b => b.status === 'Ready').length,
    Charging: mockBatteries.filter(b => b.status === 'Charging').length,
    Reserved: mockBatteries.filter(b => b.status === 'Reserved').length,
    Depleted: mockBatteries.filter(b => b.status === 'Depleted').length,
    Maintenance: mockBatteries.filter(b => b.status === 'Maintenance').length,
  };

  const filterButtons: FilterStatus[] = ['All', 'Ready', 'Charging', 'Reserved', 'Depleted', 'Maintenance'];

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-heading font-bold text-text-primary-light dark:text-text-primary-dark">
          Battery Inventory
        </h1>
        {/* View Toggle */}
        <div className="flex items-center gap-1 p-1 rounded-button bg-gray-100 dark:bg-gray-800">
          <button
            onClick={() => setViewMode('grid')}
            className={`min-h-[44px] min-w-[44px] px-3 py-2 text-xs font-medium rounded-button transition-colors duration-fast
              focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2
              ${viewMode === 'grid' ? 'bg-surface-light dark:bg-surface-dark shadow-soft text-text-primary-light dark:text-text-primary-dark' : 'text-text-secondary-light dark:text-text-secondary-dark'}`}
            aria-pressed={viewMode === 'grid'}
          >
            Grid
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`min-h-[44px] min-w-[44px] px-3 py-2 text-xs font-medium rounded-button transition-colors duration-fast
              focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2
              ${viewMode === 'list' ? 'bg-surface-light dark:bg-surface-dark shadow-soft text-text-primary-light dark:text-text-primary-dark' : 'text-text-secondary-light dark:text-text-secondary-dark'}`}
            aria-pressed={viewMode === 'list'}
          >
            List
          </button>
        </div>
      </div>

      {/* Filter Buttons */}
      <div className="flex flex-wrap gap-2">
        {filterButtons.map((status) => {
          const count = statusCounts[status];
          if (count === 0 && status !== 'All') return null;
          return (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`min-h-[44px] px-3 py-2 text-xs font-medium rounded-button transition-colors duration-fast
                focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2
                ${filter === status
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-text-secondary-light dark:text-text-secondary-dark hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
            >
              {status} ({count})
            </button>
          );
        })}
      </div>

      {/* Content */}
      {filteredBatteries.length === 0 ? (
        <EmptyState
          message={filter === 'All' ? 'No batteries in inventory' : `No batteries with status "${filter}"`}
          description={filter === 'All' ? 'Add batteries to your station to get started.' : 'Try a different filter to see batteries.'}
        />
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {filteredBatteries.map((battery) => (
            <BatteryGridCard key={battery.batteryId} battery={battery} onAction={() => {}} />
          ))}
        </div>
      ) : (
        <InventoryListView batteries={filteredBatteries} onAction={() => {}} />
      )}

      {/* Health Alerts */}
      <HealthAlerts batteries={mockBatteries} />
    </div>
  );
}
