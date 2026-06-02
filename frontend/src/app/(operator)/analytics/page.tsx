'use client';

import React, { useState } from 'react';
import { SkeletonLoader } from '@/components/ui/SkeletonLoader';
import { ErrorState } from '@/components/ui/ErrorState';

// --- Types ---
interface RevenueMetrics {
  totalRevenue: number;
  totalSwaps: number;
  avgRevenuePerSwap: number;
  customerSatisfaction: number;
  operationalEfficiency: number;
}

type DateRange = '7d' | '30d' | '90d';

// --- Mock Data ---
const mockMetrics: RevenueMetrics = {
  totalRevenue: 847500,
  totalSwaps: 565,
  avgRevenuePerSwap: 1500,
  customerSatisfaction: 4.6,
  operationalEfficiency: 92,
};

// --- Main Page ---
export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState<DateRange>('30d');
  const [loading] = useState(false);
  const [error, setError] = useState(false);

  if (loading) {
    return (
      <div className="p-4 lg:p-6 space-y-6" aria-busy="true" aria-label="Loading analytics">
        <SkeletonLoader variant="text" width="180px" height="28px" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="p-4 rounded-card bg-surface-light dark:bg-surface-dark shadow-soft">
              <SkeletonLoader variant="text" width="60%" />
              <SkeletonLoader variant="text" width="40%" height="28px" className="mt-2" />
            </div>
          ))}
        </div>
        <div className="p-4 rounded-card bg-surface-light dark:bg-surface-dark shadow-soft">
          <SkeletonLoader variant="rectangular" height="200px" className="rounded-button" />
        </div>
      </div>
    );
  }

  if (error) return <ErrorState message="Failed to load analytics" onRetry={() => setError(false)} />;

  const dateRangeOptions: { key: DateRange; label: string }[] = [
    { key: '7d', label: '7 Days' },
    { key: '30d', label: '30 Days' },
    { key: '90d', label: '90 Days' },
  ];

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-heading font-bold text-text-primary-light dark:text-text-primary-dark">
          Analytics
        </h1>
        <div className="flex items-center gap-2">
          {/* Date Range Picker */}
          <div className="flex items-center gap-1 p-1 rounded-button bg-gray-100 dark:bg-gray-800">
            {dateRangeOptions.map((option) => (
              <button
                key={option.key}
                onClick={() => setDateRange(option.key)}
                className={`min-h-[44px] px-3 py-2 text-xs font-medium rounded-button transition-colors duration-fast
                  focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2
                  ${dateRange === option.key
                    ? 'bg-surface-light dark:bg-surface-dark shadow-soft text-text-primary-light dark:text-text-primary-dark'
                    : 'text-text-secondary-light dark:text-text-secondary-dark'
                  }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          {/* Export CSV */}
          <button className="min-h-[44px] px-4 py-2 text-xs font-medium rounded-button
            border border-border-light dark:border-border-dark
            text-text-secondary-light dark:text-text-secondary-dark
            hover:bg-gray-50 dark:hover:bg-gray-800
            focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2
            transition-colors duration-fast flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export CSV
          </button>
        </div>
      </div>

      {/* Revenue Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="p-4 rounded-card bg-surface-light dark:bg-surface-dark shadow-soft">
          <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark mb-1">Total Revenue</p>
          <p className="text-lg font-heading font-bold text-text-primary-light dark:text-text-primary-dark">
            ₦{mockMetrics.totalRevenue.toLocaleString()}
          </p>
        </div>
        <div className="p-4 rounded-card bg-surface-light dark:bg-surface-dark shadow-soft">
          <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark mb-1">Total Swaps</p>
          <p className="text-lg font-heading font-bold text-text-primary-light dark:text-text-primary-dark">
            {mockMetrics.totalSwaps}
          </p>
        </div>
        <div className="p-4 rounded-card bg-surface-light dark:bg-surface-dark shadow-soft">
          <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark mb-1">Avg Revenue/Swap</p>
          <p className="text-lg font-heading font-bold text-text-primary-light dark:text-text-primary-dark">
            ₦{mockMetrics.avgRevenuePerSwap.toLocaleString()}
          </p>
        </div>
        <div className="p-4 rounded-card bg-surface-light dark:bg-surface-dark shadow-soft">
          <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark mb-1">Satisfaction</p>
          <div className="flex items-baseline gap-1">
            <p className="text-lg font-heading font-bold text-text-primary-light dark:text-text-primary-dark">
              {mockMetrics.customerSatisfaction}
            </p>
            <span className="text-xs text-text-secondary-light dark:text-text-secondary-dark">/5</span>
          </div>
        </div>
        <div className="p-4 rounded-card bg-surface-light dark:bg-surface-dark shadow-soft">
          <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark mb-1">Efficiency</p>
          <p className="text-lg font-heading font-bold text-success">
            {mockMetrics.operationalEfficiency}%
          </p>
        </div>
      </div>

      {/* Revenue Over Time Chart */}
      <section className="rounded-card bg-surface-light dark:bg-surface-dark shadow-soft p-4">
        <h2 className="text-base font-heading font-semibold text-text-primary-light dark:text-text-primary-dark mb-4">
          Revenue Over Time
        </h2>
        <div className="h-56 flex items-center justify-center border border-dashed border-border-light dark:border-border-dark rounded-button">
          <div className="text-center">
            <svg className="w-10 h-10 mx-auto text-text-secondary-light dark:text-text-secondary-dark mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
            </svg>
            <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
              Revenue area chart ({dateRange === '7d' ? 'daily' : dateRange === '30d' ? 'weekly' : 'monthly'})
            </p>
          </div>
        </div>
      </section>

      {/* Peak Hours Bar Chart */}
      <section className="rounded-card bg-surface-light dark:bg-surface-dark shadow-soft p-4">
        <h2 className="text-base font-heading font-semibold text-text-primary-light dark:text-text-primary-dark mb-4">
          Peak Hours
        </h2>
        <div className="h-48 flex items-center justify-center border border-dashed border-border-light dark:border-border-dark rounded-button">
          <div className="text-center">
            <svg className="w-10 h-10 mx-auto text-text-secondary-light dark:text-text-secondary-dark mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
              Hourly swap distribution bar chart
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
