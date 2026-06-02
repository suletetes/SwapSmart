import { describe, it, expect } from 'vitest';
import {
  isValidTransition,
  isTerminalState,
  getValidTransitions,
  validateTransition,
  ReservationState,
} from './state-machine.js';

describe('Reservation State Machine', () => {
  describe('isValidTransition', () => {
    it('allows Active → EnRoute', () => {
      expect(isValidTransition('Active', 'EnRoute')).toBe(true);
    });

    it('allows Active → Cancelled', () => {
      expect(isValidTransition('Active', 'Cancelled')).toBe(true);
    });

    it('allows Active → Expired', () => {
      expect(isValidTransition('Active', 'Expired')).toBe(true);
    });

    it('allows EnRoute → Arrived', () => {
      expect(isValidTransition('EnRoute', 'Arrived')).toBe(true);
    });

    it('allows EnRoute → Cancelled', () => {
      expect(isValidTransition('EnRoute', 'Cancelled')).toBe(true);
    });

    it('allows EnRoute → Expired', () => {
      expect(isValidTransition('EnRoute', 'Expired')).toBe(true);
    });

    it('allows Arrived → Swapping', () => {
      expect(isValidTransition('Arrived', 'Swapping')).toBe(true);
    });

    it('allows Arrived → Cancelled', () => {
      expect(isValidTransition('Arrived', 'Cancelled')).toBe(true);
    });

    it('allows Swapping → Completed', () => {
      expect(isValidTransition('Swapping', 'Completed')).toBe(true);
    });

    it('rejects Active → Arrived (must go through EnRoute)', () => {
      expect(isValidTransition('Active', 'Arrived')).toBe(false);
    });

    it('rejects Active → Swapping', () => {
      expect(isValidTransition('Active', 'Swapping')).toBe(false);
    });

    it('rejects Active → Completed', () => {
      expect(isValidTransition('Active', 'Completed')).toBe(false);
    });

    it('rejects Swapping → Cancelled', () => {
      expect(isValidTransition('Swapping', 'Cancelled')).toBe(false);
    });

    it('rejects transitions from terminal states', () => {
      expect(isValidTransition('Completed', 'Active')).toBe(false);
      expect(isValidTransition('Expired', 'Active')).toBe(false);
      expect(isValidTransition('Cancelled', 'Active')).toBe(false);
    });
  });

  describe('isTerminalState', () => {
    it('identifies Completed as terminal', () => {
      expect(isTerminalState('Completed')).toBe(true);
    });

    it('identifies Expired as terminal', () => {
      expect(isTerminalState('Expired')).toBe(true);
    });

    it('identifies Cancelled as terminal', () => {
      expect(isTerminalState('Cancelled')).toBe(true);
    });

    it('identifies Active as non-terminal', () => {
      expect(isTerminalState('Active')).toBe(false);
    });

    it('identifies EnRoute as non-terminal', () => {
      expect(isTerminalState('EnRoute')).toBe(false);
    });

    it('identifies Arrived as non-terminal', () => {
      expect(isTerminalState('Arrived')).toBe(false);
    });

    it('identifies Swapping as non-terminal', () => {
      expect(isTerminalState('Swapping')).toBe(false);
    });
  });

  describe('getValidTransitions', () => {
    it('returns correct transitions from Active', () => {
      const transitions = getValidTransitions('Active');
      expect(transitions).toContain('EnRoute');
      expect(transitions).toContain('Expired');
      expect(transitions).toContain('Cancelled');
      expect(transitions).toHaveLength(3);
    });

    it('returns correct transitions from EnRoute', () => {
      const transitions = getValidTransitions('EnRoute');
      expect(transitions).toContain('Arrived');
      expect(transitions).toContain('Expired');
      expect(transitions).toContain('Cancelled');
      expect(transitions).toHaveLength(3);
    });

    it('returns correct transitions from Arrived', () => {
      const transitions = getValidTransitions('Arrived');
      expect(transitions).toContain('Swapping');
      expect(transitions).toContain('Cancelled');
      expect(transitions).toHaveLength(2);
    });

    it('returns correct transitions from Swapping', () => {
      const transitions = getValidTransitions('Swapping');
      expect(transitions).toContain('Completed');
      expect(transitions).toHaveLength(1);
    });

    it('returns empty array for terminal states', () => {
      expect(getValidTransitions('Completed')).toEqual([]);
      expect(getValidTransitions('Expired')).toEqual([]);
      expect(getValidTransitions('Cancelled')).toEqual([]);
    });
  });

  describe('validateTransition', () => {
    it('returns valid for permitted transitions', () => {
      const result = validateTransition('Active', 'EnRoute');
      expect(result.valid).toBe(true);
    });

    it('returns invalid with reason for disallowed transitions', () => {
      const result = validateTransition('Active', 'Completed');
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.reason).toContain('Invalid transition');
        expect(result.reason).toContain('Active');
        expect(result.reason).toContain('Completed');
      }
    });

    it('returns invalid with reason for terminal state transitions', () => {
      const result = validateTransition('Completed', 'Active');
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.reason).toContain('terminal state');
      }
    });
  });
});
