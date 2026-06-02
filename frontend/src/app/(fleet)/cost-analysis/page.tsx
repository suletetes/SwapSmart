'use client';

import React, { useState } from 'react';

type ViewState = 'loading' | 'default' | 'empty' | 'error';
type Period = 'week' | 'month' | '3months' | 'year';

interface VehicleCostRow {
  id: string;
  driver: string;
  swaps: number;
  electricCost: number;
  petrolEquivalent: number;
  efficiency: number;
  savings: number;
}

const MOCK_COST_DATA: VehicleCostRow[] = [
  { id: 'KK-001', driver: 'Adamu Musa', swaps: 45, electricCost: 67500, petrolEquivalent: 180000, efficiency: 94, savings: 112500 },
  { id: 'KK-002', driver: 'Bola Tinubu', swaps: 38, electricCost: 57000, petrolEquivalent: 152000, efficiency: 88, savings: 95000 },
  { id: 'KK-003', driver: 'Chidi Okafor', swaps: 32, electricCost: 48000, petrolEquivalent: 128000, efficiency: 91, savings: 80000 },
  { id: 'KK-004', driver: 'Danladi Ibrahim', swaps: 52, electricCost: 78000, petrolEquivalent: 208000, efficiency: 96, savings: 130000 },
  { id: 'KK-005', driver: 'Emeka Nwosu', swaps: 28, electricCost: 42000, petrolEquivalent: 112000, efficiency: 82, savings: 70000 },
  { id: 'KK-006', driver: 'Fatima Abubakar', swaps: 41, electricCost: 61500, petrolEquivalent: 164000, efficiency: 90, savings: 102500 },
  { id: 'KK-007', driver: 'Garba Shehu', swaps: 35, electricCost: 52500, petrolEquivalent: 140000, efficiency: 85, savings: 87500 },
  { id: 'KK-008', driver: 'Hassan Yusuf', swaps: 44, electricCost: 66000, petrolEquivalent: 176000, efficiency: 93, savings: 110000 },
];

function SkeletonBlock({ className }: { className?: string }) {
  return <div className={`bg-border-light dark:bg-border-dark rounded animate-pulse ${className}`} />;
}

export default function CostAnalysisPage() {
  const [viewState, setViewState] = useState<ViewState>('default');
  const [period, setPeriod] = useState<Period>('month');
  const [sortBy, setSortBy] = useState<keyof VehicleCostRow>('savings');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const totalElectric = MOCK_COST_DATA.reduce((sum, v) => sum + v.electricCost, 0);
  const totalPetrol = MOCK_COST_DATA.reduce((sum, v) => sum + v.petrolEquivalent, 0);
  const totalSavings = totalPetrol - totalElectric;
  const reductionPercent = Math.round((totalSavings / totalPetrol) * 100);

  const roiProgress = 72; // 72% to break-even
  const breakEvenDate = 'August 2026';

  const sortedData = [...MOCK_COST_DATA].sort((a, b) => {
    const aVal = a[sortBy];
    const bVal = b[sortBy];
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
    }
    return sortDir === 'asc'
      ? String(aVal).localeCompare(String(bVal))
      : String(bVal).localeCompare(String(aVal));
  });

  const handleSort = (col: keyof VehicleCostRow) => {
    if (sortBy === col) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(col);
      setSortDir('desc');
    }
  };

  if (viewState === 'loading') {
    return (
      <div className="space-y-6 animate-fade-in">
        <SkeletonBlock className="h-32 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SkeletonBlock className="h-40" />
          <SkeletonBlock className="h-40" />
        </div>
        <SkeletonBlock className="h-64" />
      </div>
    );
  }

  if (viewState === 'empty') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center animate-fade-in">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <span className="text-primary text-2xl">📊</span>
        </div>
        <h2 className="font-heading font-bold text-lg text-text-primary-light dark:text-text-primary-dark mb-2">
          No Cost Data Available
        </h2>
        <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark max-w-sm">
          Cost analysis will appear once your fleet starts making battery swaps.
        </p>
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
          Failed to Load Cost Data
        </h2>
        <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark max-w-sm mb-6">
          We couldn&apos;t fetch cost analysis data. Please try again.
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
      {/* Header with period selector and export */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading font-bold text-xl text-text-primary-light dark:text-text-primary-dark">
            Cost Analysis
          </h1>
          <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark mt-1">
            Electric vs petrol cost comparison
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as Period)}
            className="min-h-[44px] px-3 rounded-button border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark text-sm text-text-primary-light dark:text-text-primary-dark"
            aria-label="Select time period"
          >
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="3months">3 Months</option>
            <option value="year">This Year</option>
          </select>
          <button className="min-h-[44px] px-4 bg-secondary text-white rounded-button text-sm font-medium hover:bg-secondary/90 transition-colors">
            Export CSV
          </button>
        </div>
      </div>

      {/* Hero Savings Metric */}
      <div className="bg-surface-light dark:bg-surface-dark rounded-card p-6 shadow-soft text-center">
        <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark font-medium uppercase tracking-wide">
          Total Savings This Period
        </p>
        <p className="font-heading font-bold text-4xl text-primary mt-2">
          ₦{totalSavings.toLocaleString()}
        </p>
        <p className="text-lg font-medium text-primary/80 mt-1">SAVED</p>
        <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark mt-2">
          {reductionPercent}% cost reduction vs petrol
        </p>
      </div>

      {/* Comparison Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Electric Card */}
        <div className="bg-surface-light dark:bg-surface-dark rounded-card p-5 shadow-soft border-2 border-primary">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-3 h-3 rounded-full bg-primary" />
            <h3 className="font-heading font-bold text-sm text-primary">Electric (SwapSmart)</h3>
          </div>
          <p className="font-heading font-bold text-2xl text-text-primary-light dark:text-text-primary-dark">
            ₦{totalElectric.toLocaleString()}
          </p>
          <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark mt-1">
            Monthly total • {MOCK_COST_DATA.reduce((s, v) => s + v.swaps, 0)} swaps
          </p>
          <div className="mt-3 flex items-center gap-1 text-xs text-primary font-medium">
            <span>↓</span> Flat cost per swap
          </div>
        </div>

        {/* Petrol Card */}
        <div className="bg-surface-light dark:bg-surface-dark rounded-card p-5 shadow-soft border-2 border-error">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-3 h-3 rounded-full bg-error" />
            <h3 className="font-heading font-bold text-sm text-error">Petrol Equivalent</h3>
          </div>
          <p className="font-heading font-bold text-2xl text-text-primary-light dark:text-text-primary-dark">
            ₦{totalPetrol.toLocaleString()}
          </p>
          <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark mt-1">
            Monthly equivalent • fuel + maintenance
          </p>
          <div className="mt-3 flex items-center gap-1 text-xs text-error font-medium">
            <span>↑</span> Rising fuel prices
          </div>
        </div>
      </div>

      {/* Trend Chart Placeholder */}
      <div className="bg-surface-light dark:bg-surface-dark rounded-card p-5 shadow-soft">
        <h3 className="font-heading font-bold text-base text-text-primary-light dark:text-text-primary-dark mb-4">
          Cost Trend (6 Months)
        </h3>
        <div className="h-48 flex items-end justify-between gap-2 px-4">
          {/* Simplified dual-line chart placeholder */}
          {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'].map((month, i) => {
            const electricHeight = 30 + Math.random() * 5; // Flat
            const petrolHeight = 35 + i * 8; // Rising
            return (
              <div key={month} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex items-end justify-center gap-1 h-36">
                  <div className="w-3 bg-primary/80 rounded-t" style={{ height: `${electricHeight}%` }} />
                  <div className="w-3 bg-error/80 rounded-t" style={{ height: `${petrolHeight}%` }} />
                </div>
                <span className="text-[10px] text-text-secondary-light dark:text-text-secondary-dark">{month}</span>
              </div>
            );
          })}
        </div>
        <div className="flex items-center justify-center gap-6 mt-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-primary/80" />
            <span className="text-text-secondary-light dark:text-text-secondary-dark">Electric (flat)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-error/80" />
            <span className="text-text-secondary-light dark:text-text-secondary-dark">Petrol (rising)</span>
          </div>
        </div>
      </div>

      {/* ROI Calculator */}
      <div className="bg-surface-light dark:bg-surface-dark rounded-card p-5 shadow-soft">
        <h3 className="font-heading font-bold text-base text-text-primary-light dark:text-text-primary-dark mb-3">
          ROI Progress
        </h3>
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-text-secondary-light dark:text-text-secondary-dark">Break-even progress</span>
          <span className="font-medium text-primary">{roiProgress}%</span>
        </div>
        <div className="w-full h-3 bg-border-light dark:bg-border-dark rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${roiProgress}%` }} />
        </div>
        <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark mt-2">
          Estimated break-even date: <span className="font-medium text-text-primary-light dark:text-text-primary-dark">{breakEvenDate}</span>
        </p>
      </div>

      {/* Per-Vehicle Breakdown Table */}
      <div className="bg-surface-light dark:bg-surface-dark rounded-card shadow-soft overflow-hidden">
        <div className="px-5 py-4 border-b border-border-light dark:border-border-dark">
          <h3 className="font-heading font-bold text-base text-text-primary-light dark:text-text-primary-dark">
            Per-Vehicle Breakdown
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-light dark:border-border-dark">
                {[
                  { key: 'id' as const, label: 'Vehicle' },
                  { key: 'driver' as const, label: 'Driver' },
                  { key: 'swaps' as const, label: 'Swaps' },
                  { key: 'electricCost' as const, label: 'Electric Cost' },
                  { key: 'efficiency' as const, label: 'Efficiency' },
                  { key: 'savings' as const, label: 'Savings' },
                ].map((col) => (
                  <th
                    key={col.key}
                    className="px-4 py-3 text-left text-xs font-medium text-text-secondary-light dark:text-text-secondary-dark uppercase tracking-wide cursor-pointer hover:text-primary min-w-[44px]"
                    onClick={() => handleSort(col.key)}
                    aria-sort={sortBy === col.key ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                  >
                    <span className="flex items-center gap-1">
                      {col.label}
                      {sortBy === col.key && <span>{sortDir === 'asc' ? '↑' : '↓'}</span>}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border-light dark:divide-border-dark">
              {sortedData.map((row) => (
                <tr key={row.id} className="hover:bg-primary/5 transition-colors">
                  <td className="px-4 py-3 font-medium text-text-primary-light dark:text-text-primary-dark">{row.id}</td>
                  <td className="px-4 py-3 text-text-secondary-light dark:text-text-secondary-dark">{row.driver}</td>
                  <td className="px-4 py-3 text-text-primary-light dark:text-text-primary-dark">{row.swaps}</td>
                  <td className="px-4 py-3 text-text-primary-light dark:text-text-primary-dark">₦{row.electricCost.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <span className={`font-medium ${row.efficiency >= 90 ? 'text-primary' : row.efficiency >= 80 ? 'text-warning' : 'text-error'}`}>
                      {row.efficiency}%
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium text-primary">₦{row.savings.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
