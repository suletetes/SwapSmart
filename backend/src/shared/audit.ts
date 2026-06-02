import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { docClient, TABLE_NAME } from './dynamo.js';
import { maskPhone } from './mask.js';

/**
 * Security-relevant event types for audit logging.
 *
 * Per Requirement 32.8: WHEN a security-relevant event occurs (authentication,
 * authorization denial, payment event, or reservation or swap state change),
 * THE SwapSmart_Platform SHALL record an immutable audit log entry capturing
 * the event type, the actor, a timestamp, and the outcome.
 */
export type AuditEventType =
  | 'AUTH_SUCCESS'
  | 'AUTH_FAILURE'
  | 'AUTH_LOCKOUT'
  | 'RESERVATION_CREATE'
  | 'SWAP_COMPLETE'
  | 'WALLET_CREDIT'
  | 'WALLET_DEBIT'
  | 'PAYMENT_CALLBACK_REJECTED'
  | 'AUTHORIZATION_DENIED'
  | 'ROLE_VIOLATION';

export type AuditOutcome = 'SUCCESS' | 'FAILURE' | 'DENIED' | 'REJECTED';

/**
 * Audit log entry structure.
 */
export interface AuditEntry {
  /** The type of security event */
  eventType: AuditEventType;
  /** The actor (userId or masked phone) */
  actor: string;
  /** ISO 8601 timestamp */
  timestamp: string;
  /** Outcome of the event */
  outcome: AuditOutcome;
  /** Source IP address */
  ipAddress: string;
  /** API Gateway request ID for correlation */
  requestId: string;
  /** Additional context about the event */
  details?: Record<string, unknown>;
}

/**
 * The audit table name. Uses the main table with a specific partition key pattern.
 * Audit entries are stored with PK: AUDIT#{date} and SK: {timestamp}#{auditId}
 * This enables efficient date-range queries while maintaining append-only semantics.
 */
const AUDIT_TABLE_NAME = process.env.AUDIT_TABLE_NAME || TABLE_NAME;

/**
 * Records an immutable audit log entry to DynamoDB.
 *
 * Per Requirement 32.9: THE SwapSmart_Platform SHALL prevent modification or
 * deletion of audit log entries before the configured compliance retention period.
 *
 * This function uses PutCommand only (no update/delete capability) to ensure
 * append-only behavior by design. The DynamoDB table has deletion protection enabled.
 */
export async function recordAuditEvent(entry: AuditEntry): Promise<void> {
  const auditId = uuidv4();
  const timestamp = entry.timestamp || new Date().toISOString();
  const datePartition = timestamp.slice(0, 10); // YYYY-MM-DD

  // Mask the actor if it looks like a phone number
  const maskedActor = entry.actor.startsWith('+')
    ? maskPhone(entry.actor)
    : entry.actor;

  const item = {
    PK: `AUDIT#${datePartition}`,
    SK: `${timestamp}#${auditId}`,
    eventType: entry.eventType,
    actor: maskedActor,
    timestamp,
    outcome: entry.outcome,
    ipAddress: entry.ipAddress,
    requestId: entry.requestId,
    details: entry.details || {},
    // TTL for automatic cleanup after retention period (365 days)
    ttl: Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60,
  };

  // Use PutCommand only — no UpdateCommand or DeleteCommand
  // This ensures append-only semantics by design
  await docClient.send(
    new PutCommand({
      TableName: AUDIT_TABLE_NAME,
      Item: item,
      // Prevent overwriting existing entries (additional safety)
      ConditionExpression: 'attribute_not_exists(PK) AND attribute_not_exists(SK)',
    })
  );
}

/**
 * Helper to extract IP address from API Gateway event.
 */
export function extractIpAddress(
  requestContext: { identity?: { sourceIp?: string } } | undefined
): string {
  return requestContext?.identity?.sourceIp || 'unknown';
}

/**
 * Helper to extract request ID from API Gateway event.
 */
export function extractRequestId(
  requestContext: { requestId?: string } | undefined
): string {
  return requestContext?.requestId || uuidv4();
}

/**
 * Convenience function to log an authentication success event.
 */
export async function logAuthSuccess(
  userId: string,
  phone: string,
  ipAddress: string,
  requestId: string
): Promise<void> {
  await recordAuditEvent({
    eventType: 'AUTH_SUCCESS',
    actor: phone,
    timestamp: new Date().toISOString(),
    outcome: 'SUCCESS',
    ipAddress,
    requestId,
    details: { userId },
  });
}

/**
 * Convenience function to log an authentication failure event.
 */
export async function logAuthFailure(
  phone: string,
  reason: string,
  ipAddress: string,
  requestId: string
): Promise<void> {
  await recordAuditEvent({
    eventType: 'AUTH_FAILURE',
    actor: phone,
    timestamp: new Date().toISOString(),
    outcome: 'FAILURE',
    ipAddress,
    requestId,
    details: { reason },
  });
}

/**
 * Convenience function to log an authentication lockout event.
 */
export async function logAuthLockout(
  phone: string,
  attemptCount: number,
  ipAddress: string,
  requestId: string
): Promise<void> {
  await recordAuditEvent({
    eventType: 'AUTH_LOCKOUT',
    actor: phone,
    timestamp: new Date().toISOString(),
    outcome: 'DENIED',
    ipAddress,
    requestId,
    details: { attemptCount },
  });
}

/**
 * Convenience function to log a reservation creation event.
 */
export async function logReservationCreate(
  userId: string,
  stationId: string,
  batteryId: string,
  ipAddress: string,
  requestId: string
): Promise<void> {
  await recordAuditEvent({
    eventType: 'RESERVATION_CREATE',
    actor: userId,
    timestamp: new Date().toISOString(),
    outcome: 'SUCCESS',
    ipAddress,
    requestId,
    details: { stationId, batteryId },
  });
}

/**
 * Convenience function to log a swap completion event.
 */
export async function logSwapComplete(
  userId: string,
  stationId: string,
  amount: number,
  receiptId: string,
  ipAddress: string,
  requestId: string
): Promise<void> {
  await recordAuditEvent({
    eventType: 'SWAP_COMPLETE',
    actor: userId,
    timestamp: new Date().toISOString(),
    outcome: 'SUCCESS',
    ipAddress,
    requestId,
    details: { stationId, amount, receiptId },
  });
}

/**
 * Convenience function to log a wallet credit event.
 */
export async function logWalletCredit(
  userId: string,
  amount: number,
  reference: string,
  source: string,
  ipAddress: string,
  requestId: string
): Promise<void> {
  await recordAuditEvent({
    eventType: 'WALLET_CREDIT',
    actor: userId,
    timestamp: new Date().toISOString(),
    outcome: 'SUCCESS',
    ipAddress,
    requestId,
    details: { amount, reference, source },
  });
}

/**
 * Convenience function to log a wallet debit event.
 */
export async function logWalletDebit(
  userId: string,
  amount: number,
  reference: string,
  reason: string,
  ipAddress: string,
  requestId: string
): Promise<void> {
  await recordAuditEvent({
    eventType: 'WALLET_DEBIT',
    actor: userId,
    timestamp: new Date().toISOString(),
    outcome: 'SUCCESS',
    ipAddress,
    requestId,
    details: { amount, reference, reason },
  });
}

/**
 * Convenience function to log a rejected payment callback.
 */
export async function logPaymentCallbackRejected(
  reference: string,
  reason: string,
  ipAddress: string,
  requestId: string
): Promise<void> {
  await recordAuditEvent({
    eventType: 'PAYMENT_CALLBACK_REJECTED',
    actor: 'system',
    timestamp: new Date().toISOString(),
    outcome: 'REJECTED',
    ipAddress,
    requestId,
    details: { reference, reason },
  });
}

/**
 * Convenience function to log an authorization denial event.
 */
export async function logAuthorizationDenied(
  userId: string,
  resource: string,
  action: string,
  ipAddress: string,
  requestId: string
): Promise<void> {
  await recordAuditEvent({
    eventType: 'AUTHORIZATION_DENIED',
    actor: userId,
    timestamp: new Date().toISOString(),
    outcome: 'DENIED',
    ipAddress,
    requestId,
    details: { resource, action },
  });
}

/**
 * Convenience function to log a role violation event.
 */
export async function logRoleViolation(
  userId: string,
  attemptedRole: string,
  actualRole: string,
  ipAddress: string,
  requestId: string
): Promise<void> {
  await recordAuditEvent({
    eventType: 'ROLE_VIOLATION',
    actor: userId,
    timestamp: new Date().toISOString(),
    outcome: 'DENIED',
    ipAddress,
    requestId,
    details: { attemptedRole, actualRole },
  });
}
