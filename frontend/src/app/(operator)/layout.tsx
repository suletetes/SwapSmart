'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/operator',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    label: 'Inventory',
    href: '/operator/inventory',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
  },
  {
    label: 'Reservations',
    href: '/operator/reservations',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    label: 'Analytics',
    href: '/operator/analytics',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    label: 'Alerts',
    href: '/operator/alerts',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
    ),
  },
  {
    label: 'Settings',
    href: '/operator/settings',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
];

function isActive(pathname: string, href: string): boolean {
  if (href === '/operator') return pathname === '/operator';
  return pathname.startsWith(href);
}

export default function OperatorLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarCollapsed] = useState(false);

  return (
    <div className="min-h-dvh bg-background-light dark:bg-background-dark flex">
      {/* Desktop Sidebar (240px) / Tablet (icons-only ~64px) */}
      <aside
        className="hidden md:flex flex-col fixed top-0 left-0 h-full z-sticky
          bg-surface-light dark:bg-surface-dark border-r border-border-light dark:border-border-dark
          lg:w-[240px] md:w-16 transition-all duration-normal"
        aria-label="Operator navigation"
      >
        {/* Logo / Brand */}
        <div className="flex items-center h-16 px-4 border-b border-border-light dark:border-border-dark">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <span className="ml-3 font-heading font-semibold text-text-primary-light dark:text-text-primary-dark hidden lg:block">
            SwapSmart
          </span>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 py-4 overflow-y-auto">
          <ul className="space-y-1 px-2">
            {navItems.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-3 rounded-button min-h-[44px] min-w-[44px]
                      transition-colors duration-fast
                      focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2
                      ${active
                        ? 'bg-primary/10 text-primary dark:bg-primary/20'
                        : 'text-text-secondary-light dark:text-text-secondary-dark hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`}
                    aria-current={active ? 'page' : undefined}
                  >
                    <span className="flex-shrink-0">{item.icon}</span>
                    <span className="hidden lg:block text-sm font-medium">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Operator Info */}
        <div className="p-4 border-t border-border-light dark:border-border-dark">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-primary">OP</span>
            </div>
            <div className="hidden lg:block">
              <p className="text-xs font-medium text-text-primary-light dark:text-text-primary-dark">Station Operator</p>
              <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark">Ikeja Station</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 md:ml-16 lg:ml-[240px] pb-20 md:pb-0">
        {children}
      </main>

      {/* Mobile Bottom Tabs */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-sticky
          bg-surface-light dark:bg-surface-dark border-t border-border-light dark:border-border-dark
          safe-area-bottom"
        aria-label="Operator navigation"
      >
        <ul className="flex items-center justify-around h-16">
          {navItems.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex flex-col items-center justify-center min-h-[44px] min-w-[44px] px-2 py-1
                    transition-colors duration-fast
                    focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-button
                    ${active
                      ? 'text-primary'
                      : 'text-text-secondary-light dark:text-text-secondary-dark'
                    }`}
                  aria-current={active ? 'page' : undefined}
                >
                  <span className="flex-shrink-0">{item.icon}</span>
                  <span className="text-[10px] mt-0.5 font-medium">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
