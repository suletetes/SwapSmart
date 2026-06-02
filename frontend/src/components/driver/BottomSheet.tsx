'use client';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { StatusBadge } from '@/components/ui';
import type { Station } from '@/hooks/useStations';

type FilterType = 'all' | 'available' | 'under5min' | 'favorites' | 'reserved';

interface BottomSheetProps {
  stations: Station[];
  isLoading: boolean;
  isError: boolean;
  onRetry?: () => void;
}

const filters: { key: FilterType; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'available', label: 'Available' },
  { key: 'under5min', label: '< 5 min' },
  { key: 'favorites', label: '⭐ Favorites' },
  { key: 'reserved', label: 'Reserved' },
];

/**
 * Draggable bottom sheet with station list.
 * - Pull handle, "Nearest Stations" heading, filter icon
 * - Filter chips: All, Available, < 5 min, Favorites, Reserved
 * - Station cards: name, distance+ETA, availability bar, price, "Reserve" button
 * - Expanded state: full list with search bar and sort options
 */
export function BottomSheet({ stations, isLoading, isError, onRetry }: BottomSheetProps) {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredStations = stations.filter((station) => {
    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!station.name.toLowerCase().includes(q) &&
          !station.address.toLowerCase().includes(q)) {
        return false;
      }
    }

    switch (activeFilter) {
      case 'available':
        return station.status === 'available';
      case 'under5min':
        return (station.eta ?? 999) < 5;
      case 'favorites':
        return station.isFavorite;
      case 'reserved':
        return false; // Would filter by active reservation
      default:
        return true;
    }
  });

  const handleStationClick = useCallback(
    (stationId: string) => {
      router.push(`/station/${stationId}`);
    },
    [router]
  );

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 bg-surface-light dark:bg-surface-dark rounded-t-bottom-sheet shadow-elevated transition-all duration-normal z-sticky ${
        isExpanded ? 'h-[85vh]' : 'h-[35vh]'
      }`}
    >
      {/* Pull handle */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex justify-center pt-3 pb-2 min-h-[44px] items-center"
        aria-label={isExpanded ? 'Collapse station list' : 'Expand station list'}
      >
        <div className="w-10 h-1 rounded-full bg-border-light dark:bg-border-dark" />
      </button>

      {/* Header */}
      <div className="px-4 pb-3">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-heading font-semibold text-text-primary-light dark:text-text-primary-dark">
            Nearest Stations
          </h2>
          <button
            className="min-w-[44px] min-h-[44px] flex items-center justify-center text-text-secondary-light dark:text-text-secondary-dark"
            aria-label="Filter options"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
          </button>
        </div>

        {/* Search bar (expanded only) */}
        {isExpanded && (
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search stations..."
            className="w-full min-h-[44px] px-4 py-2 mb-3 border border-border-light dark:border-border-dark rounded-button bg-background-light dark:bg-background-dark text-text-primary-light dark:text-text-primary-dark placeholder:text-text-secondary-light/50 focus:outline-none focus:ring-2 focus:ring-primary text-sm"
          />
        )}

        {/* Filter chips */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide" role="tablist">
          {filters.map((filter) => (
            <button
              key={filter.key}
              onClick={() => setActiveFilter(filter.key)}
              role="tab"
              aria-selected={activeFilter === filter.key}
              className={`min-h-[44px] px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-colors duration-normal ${
                activeFilter === filter.key
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-text-secondary-light dark:text-text-secondary-dark hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Station list */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-4 rounded-card bg-gray-50 dark:bg-gray-800 animate-pulse">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2" />
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-3" />
                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded w-full" />
              </div>
            ))}
          </div>
        )}

        {isError && (
          <div className="text-center py-8">
            <p className="text-sm text-error mb-3">Failed to load stations</p>
            {onRetry && (
              <button
                onClick={onRetry}
                className="min-h-[44px] px-4 py-2 text-sm font-medium text-primary hover:underline"
              >
                Try again
              </button>
            )}
          </div>
        )}

        {!isLoading && !isError && filteredStations.length === 0 && (
          <div className="text-center py-8">
            <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
              No stations match your filter
            </p>
          </div>
        )}

        {!isLoading && !isError && (
          <div className="space-y-3">
            {filteredStations.map((station) => (
              <StationCard
                key={station.stationId}
                station={station}
                onClick={() => handleStationClick(station.stationId)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface StationCardProps {
  station: Station;
  onClick: () => void;
}

function StationCard({ station, onClick }: StationCardProps) {
  const availabilityPercent = (station.availableCount / station.totalSlots) * 100;

  return (
    <button
      onClick={onClick}
      className="w-full text-left p-4 rounded-card bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark hover:border-primary/30 transition-colors duration-normal focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-text-primary-light dark:text-text-primary-dark truncate">
            {station.name}
          </h3>
          <p className="text-xs text-text-secondary-light dark:text-text-secondary-dark mt-0.5">
            {station.distance ? `${station.distance.toFixed(1)} km` : '—'}{' '}
            {station.eta ? `• ${station.eta} min` : ''}
          </p>
        </div>
        <StatusBadge status={station.status} count={station.availableCount} />
      </div>

      {/* Availability bar */}
      <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full mb-2 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-normal ${
            station.status === 'available'
              ? 'bg-success'
              : station.status === 'low'
              ? 'bg-warning'
              : 'bg-gray-400'
          }`}
          style={{ width: `${availabilityPercent}%` }}
          role="progressbar"
          aria-valuenow={station.availableCount}
          aria-valuemax={station.totalSlots}
          aria-label={`${station.availableCount} of ${station.totalSlots} batteries available`}
        />
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-text-primary-light dark:text-text-primary-dark">
          ₦{station.pricePerSwap.toLocaleString()} per swap
        </span>
        <span className="px-3 py-1 text-xs font-medium text-primary border border-primary rounded-full">
          Reserve
        </span>
      </div>
    </button>
  );
}

export default BottomSheet;
