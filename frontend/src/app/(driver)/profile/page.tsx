'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';

type TabKey = 'history' | 'analytics' | 'settings';

interface SwapHistoryItem {
  id: string;
  stationName: string;
  date: string;
  amount: number;
  batteryHealth: number;
}

export default function ProfilePage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [activeTab, setActiveTab] = useState<TabKey>('history');

  // Mock profile stats
  const stats = {
    totalSavings: 45000,
    totalSwaps: 32,
    healthScore: 94,
  };

  // Mock swap history
  const swapHistory: SwapHistoryItem[] = [
    { id: '1', stationName: 'GreenCharge Ikeja', date: '2026-06-06T10:30:00Z', amount: 1500, batteryHealth: 94 },
    { id: '2', stationName: 'PowerHub Surulere', date: '2026-06-05T14:15:00Z', amount: 1500, batteryHealth: 91 },
    { id: '3', stationName: 'EcoSwap Yaba', date: '2026-06-04T09:00:00Z', amount: 1200, batteryHealth: 96 },
    { id: '4', stationName: 'GreenCharge Ikeja', date: '2026-06-03T16:45:00Z', amount: 1500, batteryHealth: 89 },
    { id: '5', stationName: 'VoltStation Lekki', date: '2026-06-02T11:20:00Z', amount: 1800, batteryHealth: 92 },
  ];

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'history', label: 'History' },
    { key: 'analytics', label: 'Analytics' },
    { key: 'settings', label: 'Settings' },
  ];

  return (
    <div className="min-h-dvh bg-background-light dark:bg-background-dark pb-8">
      {/* Header */}
      <header className="flex items-center px-4 py-3 bg-surface-light dark:bg-surface-dark border-b border-border-light dark:border-border-dark">
        <button
          onClick={() => router.back()}
          className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 focus-visible:ring-2 focus-visible:ring-primary"
          aria-label="Go back"
        >
          <svg className="w-5 h-5 text-text-primary-light dark:text-text-primary-dark" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="flex-1 text-center text-base font-heading font-semibold text-text-primary-light dark:text-text-primary-dark">
          Profile
        </h1>
        <div className="w-[44px]" />
      </header>

      {/* Profile card */}
      <div className="px-4 pt-6 pb-4">
        <div className="flex items-center gap-4 mb-6">
          {/* Avatar */}
          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
            <span className="text-xl font-bold text-primary">
              {user?.name?.charAt(0)?.toUpperCase() || 'D'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-heading font-bold text-text-primary-light dark:text-text-primary-dark truncate">
              {user?.name || 'Driver'}
            </h2>
            <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
              {user?.vehicleReg || 'KJA-123-XY'} • {user?.kekeType || 'Bajaj RE'}
            </p>
            <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark mt-0.5">
              Member since Jan 2026
            </p>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="Savings" value={`₦${(stats.totalSavings / 1000).toFixed(0)}k`} icon="💰" />
          <StatCard label="Swaps" value={stats.totalSwaps.toString()} icon="🔋" />
          <StatCard label="Health" value={`${stats.healthScore}/100`} icon="💚" />
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4">
        <div className="flex border-b border-border-light dark:border-border-dark" role="tablist">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              role="tab"
              aria-selected={activeTab === tab.key}
              className={`flex-1 min-h-[44px] px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                activeTab === tab.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-text-secondary-light dark:text-text-secondary-dark hover:text-text-primary-light dark:hover:text-text-primary-dark'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="px-4 pt-4">
        {activeTab === 'history' && (
          <div className="space-y-3" role="tabpanel" aria-label="Swap history">
            {swapHistory.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 p-4 rounded-card bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark"
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary-light dark:text-text-primary-dark truncate">
                    {item.stationName}
                  </p>
                  <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark">
                    {new Date(item.date).toLocaleDateString('en-NG', { dateStyle: 'medium' })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-text-primary-light dark:text-text-primary-dark">
                    ₦{item.amount.toLocaleString()}
                  </p>
                  <p className="text-xs text-success">Health: {item.batteryHealth}%</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="space-y-4" role="tabpanel" aria-label="Analytics">
            <div className="p-5 rounded-card bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark text-center">
              <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark mb-1">This Month</p>
              <p className="text-2xl font-bold text-primary mb-1">₦{stats.totalSavings.toLocaleString()}</p>
              <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">saved vs petrol</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 rounded-card bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark text-center">
                <p className="text-lg font-bold text-text-primary-light dark:text-text-primary-dark">{stats.totalSwaps}</p>
                <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark">Total swaps</p>
              </div>
              <div className="p-4 rounded-card bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark text-center">
                <p className="text-lg font-bold text-text-primary-light dark:text-text-primary-dark">4.2 min</p>
                <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark">Avg wait time</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-3" role="tabpanel" aria-label="Settings">
            <SettingsItem label="Edit Profile" />
            <SettingsItem label="Vehicle Details" />
            <SettingsItem label="Notification Preferences" />
            <SettingsItem label="Privacy & Security" />
            <SettingsItem label="Help & Support" />
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div className="p-3 rounded-card bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark text-center">
      <span className="text-lg" aria-hidden="true">{icon}</span>
      <p className="text-base font-bold text-text-primary-light dark:text-text-primary-dark mt-1">{value}</p>
      <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark">{label}</p>
    </div>
  );
}

function SettingsItem({ label }: { label: string }) {
  return (
    <button className="w-full flex items-center justify-between p-4 rounded-card bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark min-h-[44px] hover:border-primary/30 transition-colors focus-visible:ring-2 focus-visible:ring-primary">
      <span className="text-sm font-medium text-text-primary-light dark:text-text-primary-dark">{label}</span>
      <svg className="w-5 h-5 text-text-secondary-light dark:text-text-secondary-dark" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </button>
  );
}
