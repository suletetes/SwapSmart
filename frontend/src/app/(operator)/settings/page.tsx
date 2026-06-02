'use client';

import React, { useState } from 'react';
import { SkeletonLoader } from '@/components/ui/SkeletonLoader';
import { ErrorState } from '@/components/ui/ErrorState';

// --- Types ---
interface StationSettings {
  pricePerSwap: number;
  openingHour: string;
  closingHour: string;
  totalSlots: number;
}

// --- Mock Data ---
const defaultSettings: StationSettings = {
  pricePerSwap: 1500,
  openingHour: '06:00',
  closingHour: '22:00',
  totalSlots: 10,
};

// --- Main Page ---
export default function SettingsPage() {
  const [settings, setSettings] = useState<StationSettings>(defaultSettings);
  const [saving, setSaving] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [loading] = useState(false);
  const [error, setError] = useState(false);

  if (loading) {
    return (
      <div className="p-4 lg:p-6 space-y-6" aria-busy="true" aria-label="Loading settings">
        <SkeletonLoader variant="text" width="150px" height="28px" />
        <div className="max-w-lg space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i}>
              <SkeletonLoader variant="text" width="100px" className="mb-2" />
              <SkeletonLoader variant="rounded" height="44px" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) return <ErrorState message="Failed to load settings" onRetry={() => setError(false)} />;

  const handleSave = async () => {
    setSaving(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 800));
    setSaving(false);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <h1 className="text-xl font-heading font-bold text-text-primary-light dark:text-text-primary-dark">
        Station Settings
      </h1>

      <div className="max-w-lg">
        <div className="rounded-card bg-surface-light dark:bg-surface-dark shadow-soft p-6 space-y-6">
          {/* Pricing */}
          <div>
            <label
              htmlFor="pricePerSwap"
              className="block text-sm font-medium text-text-primary-light dark:text-text-primary-dark mb-2"
            >
              Price per Swap (₦)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-text-secondary-light dark:text-text-secondary-dark">
                ₦
              </span>
              <input
                id="pricePerSwap"
                type="number"
                min={100}
                max={10000}
                value={settings.pricePerSwap}
                onChange={(e) => setSettings(prev => ({ ...prev, pricePerSwap: Number(e.target.value) }))}
                className="w-full min-h-[44px] pl-8 pr-4 py-3 rounded-button
                  border border-border-light dark:border-border-dark
                  bg-background-light dark:bg-background-dark
                  text-text-primary-light dark:text-text-primary-dark
                  focus:ring-2 focus:ring-primary focus:border-primary
                  transition-colors duration-fast text-sm"
              />
            </div>
            <p className="mt-1 text-xs text-text-secondary-light dark:text-text-secondary-dark">
              Amount charged per battery swap (₦100 – ₦10,000)
            </p>
          </div>

          {/* Operating Hours */}
          <div>
            <span className="block text-sm font-medium text-text-primary-light dark:text-text-primary-dark mb-2">
              Operating Hours
            </span>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="openingHour" className="block text-xs text-text-secondary-light dark:text-text-secondary-dark mb-1">
                  Opening
                </label>
                <input
                  id="openingHour"
                  type="time"
                  value={settings.openingHour}
                  onChange={(e) => setSettings(prev => ({ ...prev, openingHour: e.target.value }))}
                  className="w-full min-h-[44px] px-4 py-3 rounded-button
                    border border-border-light dark:border-border-dark
                    bg-background-light dark:bg-background-dark
                    text-text-primary-light dark:text-text-primary-dark
                    focus:ring-2 focus:ring-primary focus:border-primary
                    transition-colors duration-fast text-sm"
                />
              </div>
              <div>
                <label htmlFor="closingHour" className="block text-xs text-text-secondary-light dark:text-text-secondary-dark mb-1">
                  Closing
                </label>
                <input
                  id="closingHour"
                  type="time"
                  value={settings.closingHour}
                  onChange={(e) => setSettings(prev => ({ ...prev, closingHour: e.target.value }))}
                  className="w-full min-h-[44px] px-4 py-3 rounded-button
                    border border-border-light dark:border-border-dark
                    bg-background-light dark:bg-background-dark
                    text-text-primary-light dark:text-text-primary-dark
                    focus:ring-2 focus:ring-primary focus:border-primary
                    transition-colors duration-fast text-sm"
                />
              </div>
            </div>
          </div>

          {/* Total Slots */}
          <div>
            <label
              htmlFor="totalSlots"
              className="block text-sm font-medium text-text-primary-light dark:text-text-primary-dark mb-2"
            >
              Total Battery Slots
            </label>
            <input
              id="totalSlots"
              type="number"
              min={1}
              max={50}
              value={settings.totalSlots}
              onChange={(e) => setSettings(prev => ({ ...prev, totalSlots: Number(e.target.value) }))}
              className="w-full min-h-[44px] px-4 py-3 rounded-button
                border border-border-light dark:border-border-dark
                bg-background-light dark:bg-background-dark
                text-text-primary-light dark:text-text-primary-dark
                focus:ring-2 focus:ring-primary focus:border-primary
                transition-colors duration-fast text-sm"
            />
            <p className="mt-1 text-xs text-text-secondary-light dark:text-text-secondary-dark">
              Number of physical battery charging slots at this station (1–50)
            </p>
          </div>

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full min-h-[44px] px-6 py-3 text-sm font-medium rounded-button
              bg-primary text-white hover:bg-primary/90
              disabled:opacity-50 disabled:cursor-not-allowed
              focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2
              transition-colors duration-fast"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>

      {/* Success Toast */}
      {showToast && (
        <div
          className="fixed bottom-24 md:bottom-6 right-6 z-toast animate-slide-up"
          role="status"
          aria-live="polite"
        >
          <div className="flex items-center gap-3 px-4 py-3 rounded-button bg-success text-white shadow-elevated">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-sm font-medium">Settings saved successfully</span>
          </div>
        </div>
      )}
    </div>
  );
}
