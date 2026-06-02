/**
 * Reservation State Machine
 * Enforces valid state transitions per the design document.
 *
 * Permitted transitions:
 * - Active → EnRoute | Expired | Cancelled
 * - EnRoute → Arrived | Expired | Cancelled
 * - Arrived → Swapping | Cancelled
 * - Swapping → Completed
 * - Terminal states: Completed, Expired, Cancelled (no transitions out)
 */

export type ReservationState =
  | 'Active'
  | 'EnRoute'
  | 'Arrived'
  | 'Swapping'
  | 'Completed'
  | 'Expired'
  | 'Cancelled';

const TERMINAL_STATES: ReadonlySet<ReservationState> = new Set([
  'Completed',
  'Expired',
  'Cancelled',
]);

const PERMITTED_TRANSITIONS: Record<string, ReadonlySet<ReservationState>> = {
  Active: new Set(['EnRoute', 'Expired', 'Cancelled']),
  EnRoute: new Set(['Arrived', 'Expired', 'Cancelled']),
  Arrived: new Set(['Swapping', 'Cancelled']),
  Swapping: new Set(['Completed']),
};

/**
 * Check if a state transition is valid.
 */
export function isValidTransition(
  currentState: ReservationState,
  targetState: ReservationState
): boolean {
  if (TERMINAL_STATES.has(currentState)) {
    return false;
  }

  const allowed = PERMITTED_TRANSITIONS[currentState];
  if (!allowed) return false;

  return allowed.has(targetState);
}

/**
 * Check if a state is terminal (no further transitions allowed).
 */
export function isTerminalState(state: ReservationState): boolean {
  return TERMINAL_STATES.has(state);
}

/**
 * Get all valid target states from a given state.
 */
export function getValidTransitions(state: ReservationState): ReservationState[] {
  if (TERMINAL_STATES.has(state)) return [];
  const allowed = PERMITTED_TRANSITIONS[state];
  return allowed ? Array.from(allowed) : [];
}

/**
 * Validate and return the target state, or throw if invalid.
 */
export function validateTransition(
  currentState: ReservationState,
  targetState: ReservationState
): { valid: true } | { valid: false; reason: string } {
  if (TERMINAL_STATES.has(currentState)) {
    return {
      valid: false,
      reason: `Cannot transition from terminal state '${currentState}'`,
    };
  }

  if (!isValidTransition(currentState, targetState)) {
    const allowed = getValidTransitions(currentState);
    return {
      valid: false,
      reason: `Invalid transition from '${currentState}' to '${targetState}'. Allowed: ${allowed.join(', ')}`,
    };
  }

  return { valid: true };
}
