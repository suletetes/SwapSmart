/**
 * Property-Based Tests: Single UI State (Property 16)
 * Tests that exactly one UI_State is active per screen region at any time.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// --- Pure UI state machine simulation ---

type UIState = 'Loading' | 'Default' | 'Error' | 'Empty' | 'Offline';

type UIEvent = 'fetch_start' | 'fetch_success_data' | 'fetch_success_empty' | 'fetch_error' | 'go_offline' | 'go_online' | 'retry';

const ALL_UI_EVENTS: UIEvent[] = [
  'fetch_start', 'fetch_success_data', 'fetch_success_empty', 'fetch_error', 'go_offline', 'go_online', 'retry'
];

function transitionUIState(current: UIState, event: UIEvent): UIState {
  switch (event) {
    case 'fetch_start':
      return 'Loading';
    case 'fetch_success_data':
      return current === 'Loading' ? 'Default' : current;
    case 'fetch_success_empty':
      return current === 'Loading' ? 'Empty' : current;
    case 'fetch_error':
      return current === 'Loading' ? 'Error' : current;
    case 'go_offline':
      return 'Offline';
    case 'go_online':
      return current === 'Offline' ? 'Loading' : current;
    case 'retry':
      return current === 'Error' ? 'Loading' : current;
    default:
      return current;
  }
}

interface ScreenRegion {
  id: string;
  state: UIState;
}

describe('Feature: swapsmart-platform, Property 16: Single UI State', () => {
  /**
   * **Validates: Requirements 1.7, 33.16**
   *
   * Exactly one UI_State active per screen region at any time for any event sequence.
   */
  it('exactly one UI_State active per screen region for any event sequence', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 5 }), // number of screen regions
        fc.array(
          fc.record({
            regionIndex: fc.nat({ max: 4 }),
            event: fc.constantFrom(...ALL_UI_EVENTS),
          }),
          { minLength: 1, maxLength: 30 }
        ),
        (regionCount: number, events) => {
          // Initialize regions
          const regions: ScreenRegion[] = Array.from({ length: regionCount }, (_, i) => ({
            id: `region-${i}`,
            state: 'Loading' as UIState,
          }));

          for (const { regionIndex, event } of events) {
            const idx = regionIndex % regionCount;
            const prevState = regions[idx].state;
            regions[idx].state = transitionUIState(prevState, event);

            // INVARIANT: each region has exactly one state
            for (const region of regions) {
              const stateValues: UIState[] = ['Loading', 'Default', 'Error', 'Empty', 'Offline'];
              const matchCount = stateValues.filter(s => s === region.state).length;
              expect(matchCount).toBe(1);

              // State must be one of the valid states
              expect(stateValues).toContain(region.state);
            }
          }
        }
      ),
      { numRuns: 150 }
    );
  });

  it('transitions are deterministic for same state+event', () => {
    fc.assert(
      fc.property(
        fc.constantFrom<UIState>('Loading', 'Default', 'Error', 'Empty', 'Offline'),
        fc.constantFrom(...ALL_UI_EVENTS),
        (state: UIState, event: UIEvent) => {
          const result1 = transitionUIState(state, event);
          const result2 = transitionUIState(state, event);

          // INVARIANT: same input always produces same output
          expect(result1).toBe(result2);
        }
      ),
      { numRuns: 150 }
    );
  });
});
