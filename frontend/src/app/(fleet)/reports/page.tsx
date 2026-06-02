'use client';

import React from 'react';

export default function ReportsPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-heading font-bold text-xl text-text-primary-light dark:text-text-primary-dark">
          Reports
        </h1>
        <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark mt-1">
          Generate and export fleet reports
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { title: 'Monthly Summary', desc: 'Fleet performance overview', icon: '📊' },
          { title: 'Cost Report', desc: 'Detailed cost breakdown', icon: '💰' },
          { title: 'Driver Performance', desc: 'Individual driver metrics', icon: '👤' },
          { title: 'Maintenance Log', desc: 'Battery health history', icon: '🔧' },
        ].map((report) => (
          <div
            key={report.title}
            className="bg-surface-light dark:bg-surface-dark rounded-card p-5 shadow-soft hover:shadow-elevated transition-shadow cursor-pointer"
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl">{report.icon}</span>
              <div className="flex-1">
                <h3 className="font-heading font-bold text-sm text-text-primary-light dark:text-text-primary-dark">
                  {report.title}
                </h3>
                <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark mt-1">
                  {report.desc}
                </p>
              </div>
              <button className="min-h-[44px] min-w-[44px] flex items-center justify-center text-primary hover:bg-primary/10 rounded-button transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
