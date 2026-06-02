'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth.store';

export interface Station {
  stationId: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  totalSlots: number;
  availableCount: number;
  chargingCount: number;
  status: 'available' | 'low' | 'empty';
  pricePerSwap: number;
  rating: number;
  hours: string;
  distance?: number;
  eta?: number;
  isFavorite?: boolean;
  lastUpdated?: string;
}

interface StationsResponse {
  stations: Station[];
  total: number;
}

interface UseStationsOptions {
  lat?: number;
  lng?: number;
  radius?: number;
  filter?: string;
  enabled?: boolean;
}

async function fetchStations(
  token: string | undefined,
  options: UseStationsOptions
): Promise<StationsResponse> {
  const params = new URLSearchParams();
  if (options.lat) params.set('lat', options.lat.toString());
  if (options.lng) params.set('lng', options.lng.toString());
  if (options.radius) params.set('radius', options.radius.toString());

  const response = await fetch(`/api/v1/stations?${params}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch stations');
  }

  return response.json();
}

export function useStations(options: UseStationsOptions = {}) {
  const token = useAuthStore((s) => s.tokens?.accessToken);

  return useQuery({
    queryKey: ['stations', options.lat, options.lng, options.radius],
    queryFn: () => fetchStations(token, options),
    enabled: options.enabled !== false && !!token,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });
}

export function useStationDetail(stationId: string) {
  const token = useAuthStore((s) => s.tokens?.accessToken);

  return useQuery({
    queryKey: ['station', stationId],
    queryFn: async () => {
      const response = await fetch(`/api/v1/stations/${stationId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch station');
      return response.json() as Promise<Station & {
        batteries: Array<{
          batteryId: string;
          state: string;
          chargeLevel: number;
          healthScore: number;
        }>;
        prediction?: {
          waitTime: string;
          demand: string;
          confidence: string;
        };
      }>;
    },
    enabled: !!stationId && !!token,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });
}
