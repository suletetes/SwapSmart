'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useStations, type Station } from '@/hooks/useStations';
import { useWebSocket } from '@/hooks/useWebSocket';
import { BottomSheet } from '@/components/driver/BottomSheet';
import { AIRecommendation } from '@/components/driver/AIRecommendation';
import { SkeletonLoader } from '@/components/ui';

/**
 * Driver Home — Main map view with station markers.
 * - MapLibre GL JS map (full screen, 70% viewport)
 * - Battery level pill top center
 * - Hamburger menu icon top-left, notification bell top-right
 * - Station markers with StatusBadge
 * - States: Loading, Empty, Error, Offline
 */
export default function DriverHomePage() {
  const router = useRouter();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [batteryLevel] = useState(42); // Would come from real telemetry
  const [notificationCount] = useState(2);

  // Get user location
  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => {
        // Default to Lagos if location unavailable
        setUserLocation({ lat: 6.5244, lng: 3.3792 });
      },
      { enableHighAccuracy: true }
    );
  }, []);

  // Fetch stations
  const {
    data: stationsData,
    isLoading,
    isError,
    refetch,
  } = useStations({
    lat: userLocation?.lat,
    lng: userLocation?.lng,
    radius: 10,
    enabled: !!userLocation,
  });

  const stations: Station[] = stationsData?.stations || [];

  // WebSocket for real-time updates
  const { subscribe, channels } = useWebSocket();

  useEffect(() => {
    if (!stations.length) return;

    const unsubscribers = stations.map((station) =>
      subscribe(channels.stationAvailability(station.stationId), () => {
        refetch();
      })
    );

    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }, [stations, subscribe, channels, refetch]);

  // Estimated range based on battery level
  const estimatedRange = Math.round((batteryLevel / 100) * 60);

  const handleMenuClick = useCallback(() => {
    // Would open side navigation drawer
  }, []);

  return (
    <div className="relative h-dvh overflow-hidden">
      {/* Map container */}
      <div
        ref={mapContainerRef}
        className="absolute inset-0 bg-gray-100 dark:bg-gray-900"
        style={{ height: '70vh' }}
      >
        {/* Map placeholder — MapLibre GL JS would render here */}
        {isLoading && !stations.length ? (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full motion-safe:animate-spin mx-auto mb-3" />
              <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
                Finding stations near you...
              </p>
            </div>
          </div>
        ) : (
          <MapView
            stations={stations}
            userLocation={userLocation}
          />
        )}
      </div>

      {/* Top overlay controls */}
      <div className="absolute top-0 left-0 right-0 z-dropdown p-4 flex items-start justify-between pointer-events-none">
        {/* Hamburger menu */}
        <button
          onClick={handleMenuClick}
          className="pointer-events-auto min-w-[44px] min-h-[44px] flex items-center justify-center bg-surface-light dark:bg-surface-dark rounded-full shadow-soft focus-visible:ring-2 focus-visible:ring-primary"
          aria-label="Open menu"
        >
          <svg className="w-5 h-5 text-text-primary-light dark:text-text-primary-dark" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* Battery level pill */}
        <div className="pointer-events-auto px-4 py-2 bg-surface-light dark:bg-surface-dark rounded-full shadow-soft">
          <span className="text-sm font-medium text-text-primary-light dark:text-text-primary-dark">
            <span className={batteryLevel < 20 ? 'text-error' : batteryLevel < 40 ? 'text-warning' : 'text-success'}>
              {batteryLevel}%
            </span>
            {' — ~'}{estimatedRange}km remaining
          </span>
        </div>

        {/* Notification bell */}
        <button
          onClick={() => router.push('/notifications')}
          className="pointer-events-auto relative min-w-[44px] min-h-[44px] flex items-center justify-center bg-surface-light dark:bg-surface-dark rounded-full shadow-soft focus-visible:ring-2 focus-visible:ring-primary"
          aria-label={`Notifications: ${notificationCount} unread`}
        >
          <svg className="w-5 h-5 text-text-primary-light dark:text-text-primary-dark" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
          </svg>
          {notificationCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-error text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {notificationCount}
            </span>
          )}
        </button>
      </div>

      {/* AI Recommendation FAB */}
      <div className="absolute bottom-[37vh] right-4 z-dropdown">
        <AIRecommendation />
      </div>

      {/* Bottom Sheet */}
      <BottomSheet
        stations={stations}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => refetch()}
      />
    </div>
  );
}

/**
 * Map view component — renders MapLibre GL JS map with station markers.
 * Falls back to a styled placeholder if MapLibre isn't available.
 */
function MapView({
  stations,
  userLocation,
}: {
  stations: Station[];
  userLocation: { lat: number; lng: number } | null;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    if (!mapRef.current || !userLocation) return;

    let map: unknown = null;

    // Dynamic import of MapLibre GL JS
    import('maplibre-gl')
      .then((maplibregl) => {
        if (!mapRef.current) return;

        map = new maplibregl.Map({
          container: mapRef.current,
          style: {
            version: 8,
            sources: {
              osm: {
                type: 'raster',
                tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
                tileSize: 256,
                attribution: '© OpenStreetMap contributors',
              },
            },
            layers: [
              {
                id: 'osm',
                type: 'raster',
                source: 'osm',
              },
            ],
          },
          center: [userLocation.lng, userLocation.lat],
          zoom: 13,
        });

        (map as { on: (event: string, cb: () => void) => void }).on('load', () => {
          setMapLoaded(true);
        });
      })
      .catch(() => {
        // MapLibre not available — show placeholder
        setMapLoaded(false);
      });

    return () => {
      if (map && typeof (map as { remove: () => void }).remove === 'function') {
        (map as { remove: () => void }).remove();
      }
    };
  }, [userLocation]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapRef} className="w-full h-full" />

      {/* Fallback map placeholder if MapLibre fails to load */}
      {!mapLoaded && (
        <div className="absolute inset-0 bg-gradient-to-b from-green-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
          <div className="text-center">
            <svg className="w-16 h-16 text-primary/30 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
            </svg>
            <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark">
              {stations.length} stations nearby
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
