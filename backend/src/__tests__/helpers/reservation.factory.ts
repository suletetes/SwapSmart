/**
 * Reservation Factory — creates test reservations in various states
 */

import type { ReservationState } from '../../reservation/state-machine.js';

export interface TestReservation {
  reservationId: string;
  driverId: string;
  stationId: string;
  batteryId: string;
  state: ReservationState;
  createdAt: string;
  expiresAt: string;
  extensionCount: number;
  swapCode?: string;
}

let reservationCounter = 0;

export interface ReservationFactoryOptions {
  reservationId?: string;
  driverId?: string;
  stationId?: string;
  batteryId?: string;
  state?: ReservationState;
  createdAt?: string;
  expiresAt?: string;
  extensionCount?: number;
  swapCode?: string;
}

export function createTestReservation(options: ReservationFactoryOptions = {}): TestReservation {
  reservationCounter++;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 15 * 60 * 1000);

  return {
    reservationId: options.reservationId || `res-${reservationCounter}`,
    driverId: options.driverId || `driver-${reservationCounter}`,
    stationId: options.stationId || `station-1`,
    batteryId: options.batteryId || `bat-${reservationCounter}`,
    state: options.state || 'Active',
    createdAt: options.createdAt || now.toISOString(),
    expiresAt: options.expiresAt || expiresAt.toISOString(),
    extensionCount: options.extensionCount ?? 0,
    swapCode: options.swapCode,
  };
}

export function createExpiredReservation(options: ReservationFactoryOptions = {}): TestReservation {
  const pastTime = new Date(Date.now() - 20 * 60 * 1000);
  return createTestReservation({
    ...options,
    state: 'Expired',
    createdAt: new Date(pastTime.getTime() - 15 * 60 * 1000).toISOString(),
    expiresAt: pastTime.toISOString(),
  });
}

export function createArrivedReservation(options: ReservationFactoryOptions = {}): TestReservation {
  return createTestReservation({
    ...options,
    state: 'Arrived',
    swapCode: options.swapCode || '4829',
  });
}

export function resetReservationCounters(): void {
  reservationCounter = 0;
}
