/**
 * Property-Based Tests: Telemetry Deduplication (Property 13)
 * Tests that duplicate readings (same vehicle_id + timestamp) result in exactly one stored reading.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { arbTelemetryReading, type TelemetryReading } from '../helpers/operations.arbitrary.js';

// --- Pure telemetry store simulation ---

interface TelemetryStore {
  readings: Map<string, TelemetryReading>; // key: vehicleId+timestamp
}

function createTelemetryStore(): TelemetryStore {
  return { readings: new Map() };
}

function compositeKey(reading: TelemetryReading): string {
  return `${reading.vehicleId}|${reading.timestamp}`;
}

function ingestReading(store: TelemetryStore, reading: TelemetryReading): TelemetryStore {
  const key = compositeKey(reading);
  // Deduplication: only store if not already present
  if (!store.readings.has(key)) {
    store.readings.set(key, reading);
  }
  return store;
}

describe('Feature: swapsmart-platform, Property 13: Telemetry Deduplication', () => {
  /**
   * **Validates: Requirements 28.3, 33.13**
   *
   * Duplicate readings (same vehicle_id + timestamp) result in exactly one stored reading.
   */
  it('same vehicle+timestamp = one reading regardless of duplicates', () => {
    fc.assert(
      fc.property(
        arbTelemetryReading(),
        fc.integer({ min: 1, max: 10 }),
        (reading: TelemetryReading, duplicateCount: number) => {
          let store = createTelemetryStore();

          // Ingest the same reading multiple times
          for (let i = 0; i < duplicateCount; i++) {
            store = ingestReading(store, reading);
          }

          // INVARIANT: exactly one reading stored
          const key = compositeKey(reading);
          expect(store.readings.has(key)).toBe(true);
          expect(store.readings.size).toBe(1);
        }
      ),
      { numRuns: 150 }
    );
  });

  it('different vehicle+timestamp combinations are stored separately', () => {
    fc.assert(
      fc.property(
        fc.array(arbTelemetryReading(), { minLength: 2, maxLength: 20 }),
        (readings: TelemetryReading[]) => {
          let store = createTelemetryStore();

          for (const reading of readings) {
            store = ingestReading(store, reading);
          }

          // INVARIANT: stored count equals unique keys count
          const uniqueKeys = new Set(readings.map(compositeKey));
          expect(store.readings.size).toBe(uniqueKeys.size);
        }
      ),
      { numRuns: 150 }
    );
  });
});
