'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth.store';

export type ReservationState =
  | 'Active'
  | 'EnRoute'
  | 'Arrived'
  | 'Swapping'
  | 'Completed'
  | 'Expired'
  | 'Cancelled';

export interface Reservation {
  reservationId: string;
  stationId: string;
  stationName: string;
  batteryId: string;
  state: ReservationState;
  createdAt: string;
  expiresAt: string;
  swapCode?: string;
  extensionCount: number;
}

export function useActiveReservation() {
  const token = useAuthStore((s) => s.tokens?.accessToken);

  return useQuery({
    queryKey: ['reservation', 'active'],
    queryFn: async () => {
      const response = await fetch('/api/v1/reservations/active', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.status === 404) return null;
      if (!response.ok) throw new Error('Failed to fetch reservation');
      return response.json() as Promise<Reservation>;
    },
    enabled: !!token,
    staleTime: 10 * 1000,
    refetchInterval: 15 * 1000,
  });
}

export function useCreateReservation() {
  const token = useAuthStore((s) => s.tokens?.accessToken);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (stationId: string) => {
      const response = await fetch('/api/v1/reservations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ stationId }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to create reservation');
      }
      return response.json() as Promise<Reservation>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservation'] });
      queryClient.invalidateQueries({ queryKey: ['stations'] });
    },
  });
}

export function useCancelReservation() {
  const token = useAuthStore((s) => s.tokens?.accessToken);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reservationId: string) => {
      const response = await fetch(
        `/api/v1/reservations/${reservationId}/cancel`,
        {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!response.ok) throw new Error('Failed to cancel reservation');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservation'] });
      queryClient.invalidateQueries({ queryKey: ['stations'] });
    },
  });
}
