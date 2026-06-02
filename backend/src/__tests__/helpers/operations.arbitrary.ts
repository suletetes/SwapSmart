/**
 * Operations Arbitrary — fast-check arbitraries for operation sequences
 * (reserve, expire, cancel, reassign, swap)
 */

import * as fc from 'fast-check';
import type { BatteryState } from './station.factory.js';
import type { ReservationState } from '../../reservation/state-machine.js';

export type OperationType = 'reserve' | 'expire' | 'cancel' | 'reassign' | 'swap' | 'charge_complete' | 'return_battery';

export interface Operation {
  type: OperationType;
  batteryIndex: number;
  driverId: string;
}

/**
 * Arbitrary for a single operation
 */
export function arbOperation(maxBatteries: number): fc.Arbitrary<Operation> {
  return fc.record({
    type: fc.constantFrom<OperationType>('reserve', 'expire', 'cancel', 'reassign', 'swap', 'charge_complete', 'return_battery'),
    batteryIndex: fc.nat({ max: Math.max(0, maxBatteries - 1) }),
    driverId: fc.stringOf(fc.constantFrom('a', 'b', 'c', 'd', 'e'), { minLength: 1, maxLength: 3 }).map(s => `driver-${s}`),
  });
}

/**
 * Arbitrary for a sequence of operations
 */
export function arbOperationSequence(maxBatteries: number, maxOps: number = 20): fc.Arbitrary<Operation[]> {
  return fc.array(arbOperation(maxBatteries), { minLength: 1, maxLength: maxOps });
}

/**
 * Arbitrary for valid battery states
 */
export function arbBatteryState(): fc.Arbitrary<BatteryState> {
  return fc.constantFrom<BatteryState>('Charging', 'Ready', 'Reserved', 'In_Vehicle', 'Depleted', 'Maintenance');
}

/**
 * Arbitrary for reservation states
 */
export function arbReservationState(): fc.Arbitrary<ReservationState> {
  return fc.constantFrom<ReservationState>('Active', 'EnRoute', 'Arrived', 'Swapping', 'Completed', 'Expired', 'Cancelled');
}

/**
 * Arbitrary for credit/debit operations on a wallet
 */
export type WalletOp = { type: 'credit'; amount: number; reference: string } | { type: 'debit'; amount: number; reference: string };

export function arbWalletOp(): fc.Arbitrary<WalletOp> {
  return fc.oneof(
    fc.record({
      type: fc.constant('credit' as const),
      amount: fc.integer({ min: 100, max: 500000 }),
      reference: fc.uuid(),
    }),
    fc.record({
      type: fc.constant('debit' as const),
      amount: fc.integer({ min: 100, max: 50000 }),
      reference: fc.uuid(),
    })
  );
}

export function arbWalletOpSequence(maxOps: number = 30): fc.Arbitrary<WalletOp[]> {
  return fc.array(arbWalletOp(), { minLength: 1, maxLength: maxOps });
}

/**
 * Arbitrary for telemetry readings
 */
export interface TelemetryReading {
  vehicleId: string;
  timestamp: string;
  batteryLevel: number;
  latitude: number;
  longitude: number;
  speedKmh: number;
  temperatureC: number;
}

export function arbTelemetryReading(): fc.Arbitrary<TelemetryReading> {
  return fc.record({
    vehicleId: fc.stringOf(fc.constantFrom('v', '1', '2', '3'), { minLength: 2, maxLength: 5 }).map(s => `vehicle-${s}`),
    timestamp: fc.date({ min: new Date('2026-01-01'), max: new Date('2026-12-31') }).map(d => d.toISOString()),
    batteryLevel: fc.double({ min: 0, max: 100, noNaN: true }),
    latitude: fc.double({ min: 6.0, max: 7.0, noNaN: true }),
    longitude: fc.double({ min: 3.0, max: 4.0, noNaN: true }),
    speedKmh: fc.double({ min: 0, max: 80, noNaN: true }),
    temperatureC: fc.double({ min: 20, max: 50, noNaN: true }),
  });
}

/**
 * Arbitrary for notification events
 */
export interface NotificationEvent {
  eventId: string;
  userId: string;
  channel: 'push' | 'sms' | 'in_app';
  type: string;
}

export function arbNotificationEvent(): fc.Arbitrary<NotificationEvent> {
  return fc.record({
    eventId: fc.uuid(),
    userId: fc.stringOf(fc.constantFrom('u', '1', '2', '3'), { minLength: 2, maxLength: 4 }).map(s => `user-${s}`),
    channel: fc.constantFrom<'push' | 'sms' | 'in_app'>('push', 'sms', 'in_app'),
    type: fc.constantFrom('reservation_created', 'swap_completed', 'wallet_credited', 'low_battery'),
  });
}
