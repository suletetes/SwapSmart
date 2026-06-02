'use client';

import React from 'react';

export default function FleetSettingsPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-heading font-bold text-xl text-text-primary-light dark:text-text-primary-dark">
          Settings
        </h1>
        <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark mt-1">
          Fleet configuration and preferences
        </p>
      </div>

      <div className="space-y-4">
        {[
          { title: 'Fleet Information', desc: 'Company name, contact details' },
          { title: 'Notifications', desc: 'Alert preferences and thresholds' },
          { title: 'Low Battery Threshold', desc: 'Currently set to 20%' },
          { title: 'Auto-assign Drivers', desc: 'Automatically assign available drivers' },
          { title: 'Report Schedule', desc: 'Weekly summary every Monday' },
        ].map((setting) => (
          <div
            key={setting.title}
            className="bg-surface-light dark:bg-surface-dark rounded-card p-5 shadow-soft flex items-center justify-between"
          >
            <div>
              <h3 className="font-medium text-sm text-text-primary-light dark:text-text-primary-dark">
                {setting.title}
              </h3>
              <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark mt-0.5">
                {setting.desc}
              </p>
            </div>
            <button className="min-h-[44px] min-w-[44px] px-3 text-xs text-primary hover:bg-primary/10 rounded-button transition-colors font-medium">
              Edit
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
