'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { useAuthStore } from '@/stores/auth.store';

type NotifFilter = 'all' | 'reservations' | 'payments' | 'system';

interface Notification {
  id: string;
  type: 'reservation' | 'payment' | 'system' | 'promotion';
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
}

const filterTabs: { key: NotifFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'reservations', label: 'Reservations' },
  { key: 'payments', label: 'Payments' },
  { key: 'system', label: 'System' },
];

export default function NotificationsPage() {
  const router = useRouter();
  const token = useAuthStore((s) => s.tokens?.accessToken);
  const queryClient = useQueryClient();
  const [activeFilter, setActiveFilter] = useState<NotifFilter>('all');

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const response = await fetch('/api/v1/notifications', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch notifications');
      const data = await response.json();
      return (data.notifications || []) as Notification[];
    },
    enabled: !!token,
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      await fetch('/api/v1/notifications/read', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  // Mock notifications for demo
  const mockNotifications: Notification[] = notifications.length > 0 ? notifications : [
    { id: '1', type: 'reservation', title: 'Reservation Confirmed', body: 'Battery reserved at GreenCharge Ikeja. You have 15 minutes.', read: false, createdAt: '2026-06-06T10:30:00Z' },
    { id: '2', type: 'payment', title: 'Wallet Topped Up', body: '₦5,000 added to your wallet via Visa •••• 4242', read: false, createdAt: '2026-06-06T09:15:00Z' },
    { id: '3', type: 'system', title: 'Swap Complete', body: 'Battery swap completed at PowerHub Surulere. Receipt: RCP-2026-0042', read: true, createdAt: '2026-06-05T14:30:00Z' },
    { id: '4', type: 'reservation', title: 'Reservation Expired', body: 'Your reservation at EcoSwap Yaba has expired.', read: true, createdAt: '2026-06-04T16:00:00Z' },
    { id: '5', type: 'promotion', title: 'Weekend Special!', body: 'Get 10% off all swaps this weekend. Use code WEEKEND10.', read: true, createdAt: '2026-06-03T08:00:00Z' },
  ];

  const filteredNotifications = mockNotifications.filter((n) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'reservations') return n.type === 'reservation';
    if (activeFilter === 'payments') return n.type === 'payment';
    if (activeFilter === 'system') return n.type === 'system' || n.type === 'promotion';
    return true;
  });

  const unreadCount = mockNotifications.filter((n) => !n.read).length;

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
          Notifications
          {unreadCount > 0 && (
            <span className="ml-2 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-error rounded-full">
              {unreadCount}
            </span>
          )}
        </h1>
        {unreadCount > 0 && (
          <button
            onClick={() => markAllReadMutation.mutate()}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center text-xs text-primary font-medium focus-visible:ring-2 focus-visible:ring-primary rounded"
            aria-label="Mark all as read"
          >
            Mark all
          </button>
        )}
        {unreadCount === 0 && <div className="w-[44px]" />}
      </header>

      {/* Filter tabs */}
      <div className="px-4 pt-3 pb-2">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide" role="tablist">
          {filterTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveFilter(tab.key)}
              role="tab"
              aria-selected={activeFilter === tab.key}
              className={`min-h-[44px] px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                activeFilter === tab.key
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-text-secondary-light dark:text-text-secondary-dark hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Notification list */}
      <div className="px-4 pt-2">
        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-4 rounded-card bg-surface-light dark:bg-surface-dark animate-pulse">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2" />
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full" />
              </div>
            ))}
          </div>
        )}

        {!isLoading && filteredNotifications.length === 0 && (
          <EmptyState
            message="No notifications"
            description="You're all caught up! New notifications will appear here."
            icon={
              <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            }
          />
        )}

        {!isLoading && filteredNotifications.length > 0 && (
          <div className="space-y-2" role="list" aria-label="Notifications">
            {filteredNotifications.map((notif) => (
              <NotificationCard key={notif.id} notification={notif} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function NotificationCard({ notification }: { notification: Notification }) {
  const iconMap: Record<string, React.ReactNode> = {
    reservation: (
      <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    payment: (
      <svg className="w-5 h-5 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    system: (
      <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    promotion: (
      <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
      </svg>
    ),
  };

  return (
    <div
      role="listitem"
      className={`flex items-start gap-3 p-4 rounded-card border transition-colors ${
        notification.read
          ? 'bg-surface-light dark:bg-surface-dark border-border-light dark:border-border-dark'
          : 'bg-primary/5 dark:bg-primary/10 border-primary/20'
      }`}
    >
      <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
        {iconMap[notification.type]}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-text-primary-light dark:text-text-primary-dark truncate">
            {notification.title}
          </h3>
          {!notification.read && (
            <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" aria-label="Unread" />
          )}
        </div>
        <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark mt-0.5 line-clamp-2">
          {notification.body}
        </p>
        <p className="text-xs text-text-secondary-light/60 dark:text-text-secondary-dark/60 mt-1">
          {formatTimeAgo(notification.createdAt)}
        </p>
      </div>
    </div>
  );
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
