/**
 * Property-Based Tests: Notification At-Most-Once (Property 14)
 * Tests that each recipient receives at most one notification per channel per event.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { arbNotificationEvent, type NotificationEvent } from '../helpers/operations.arbitrary.js';

// --- Pure notification delivery simulation ---

interface DeliveryRecord {
  eventId: string;
  userId: string;
  channel: string;
}

interface NotificationService {
  delivered: Set<string>; // composite key: eventId|userId|channel
  deliveryLog: DeliveryRecord[];
}

function createNotificationService(): NotificationService {
  return { delivered: new Set(), deliveryLog: [] };
}

function deliverNotification(service: NotificationService, event: NotificationEvent): NotificationService {
  const key = `${event.eventId}|${event.userId}|${event.channel}`;

  // At-most-once: skip if already delivered
  if (service.delivered.has(key)) {
    return service;
  }

  const delivered = new Set(service.delivered);
  delivered.add(key);

  return {
    delivered,
    deliveryLog: [...service.deliveryLog, {
      eventId: event.eventId,
      userId: event.userId,
      channel: event.channel,
    }],
  };
}

describe('Feature: swapsmart-platform, Property 14: Notification At-Most-Once', () => {
  /**
   * **Validates: Requirements 29.2, 33.14**
   *
   * Each recipient receives at most one notification per channel per event.
   */
  it('one notification per channel per event per recipient', () => {
    fc.assert(
      fc.property(
        arbNotificationEvent(),
        fc.integer({ min: 1, max: 10 }),
        (event: NotificationEvent, duplicateCount: number) => {
          let service = createNotificationService();

          // Attempt to deliver the same event multiple times
          for (let i = 0; i < duplicateCount; i++) {
            service = deliverNotification(service, event);
          }

          // INVARIANT: exactly one delivery in the log
          const deliveries = service.deliveryLog.filter(
            d => d.eventId === event.eventId && d.userId === event.userId && d.channel === event.channel
          );
          expect(deliveries.length).toBe(1);
        }
      ),
      { numRuns: 150 }
    );
  });

  it('different events to same user on same channel are delivered separately', () => {
    fc.assert(
      fc.property(
        fc.array(arbNotificationEvent(), { minLength: 2, maxLength: 15 }),
        (events: NotificationEvent[]) => {
          let service = createNotificationService();

          for (const event of events) {
            service = deliverNotification(service, event);
          }

          // INVARIANT: delivery count equals unique (eventId, userId, channel) combinations
          const uniqueKeys = new Set(
            events.map(e => `${e.eventId}|${e.userId}|${e.channel}`)
          );
          expect(service.deliveryLog.length).toBe(uniqueKeys.size);
        }
      ),
      { numRuns: 150 }
    );
  });
});
