import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';
import {
  success,
  badRequest,
  unauthorized,
  notFound,
  internalError,
} from '../shared/response.js';
import {
  getWalletBalance,
  getLedgerEntries,
  createPendingTopUp,
  completeTopUp,
} from './wallet.service.js';
import { initializeTransaction, verifyWebhookSignature } from './paystack.js';

const eventBridgeClient = new EventBridgeClient({
  region: process.env.AWS_REGION || 'af-south-1',
});

const EVENT_BUS_NAME = process.env.EVENT_BUS_NAME || 'swapsmart-events-dev';
const PAYSTACK_CALLBACK_URL = process.env.PAYSTACK_CALLBACK_URL || 'https://swapsmart.app/wallet/callback';

/** Minimum top-up amount in Naira */
const MIN_TOPUP_AMOUNT = 100;
/** Maximum top-up amount in Naira */
const MAX_TOPUP_AMOUNT = 500_000;

/**
 * Wallet Service Lambda Handler
 * Routes requests to the appropriate wallet operation based on path and method.
 */
export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const { httpMethod, path } = event;

  try {
    // GET /v1/wallet
    if (httpMethod === 'GET' && path === '/v1/wallet') {
      return handleGetWallet(event);
    }

    // POST /v1/wallet/topup
    if (httpMethod === 'POST' && path === '/v1/wallet/topup') {
      return handleTopUp(event);
    }

    // POST /v1/wallet/topup/callback
    if (httpMethod === 'POST' && path === '/v1/wallet/topup/callback') {
      return handleTopUpCallback(event);
    }

    // OPTIONS for CORS preflight
    if (httpMethod === 'OPTIONS') {
      return success({ message: 'OK' });
    }

    return notFound('Route not found');
  } catch (err) {
    console.error('Wallet handler error:', err);
    return internalError();
  }
}

/**
 * GET /v1/wallet
 * Return current balance + 20 most recent ledger entries (ordered most-recent-first)
 */
async function handleGetWallet(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const userId = getAuthenticatedUserId(event);
  if (!userId) {
    return unauthorized('Authentication required');
  }

  const [wallet, entries] = await Promise.all([
    getWalletBalance(userId),
    getLedgerEntries(userId, 20),
  ]);

  return success({
    balance: wallet.balance,
    updatedAt: wallet.updatedAt,
    transactions: entries,
  });
}

/**
 * POST /v1/wallet/topup
 * Validate amount (₦100–₦500,000), initiate Paystack charge.
 * 1. Call Paystack Initialize Transaction API (amount in kobo, email placeholder, callback_url)
 * 2. Create pending Ledger_Entry in SwapSmart_Ledger (status=PENDING, reference from Paystack)
 * 3. Return authorization_url for client redirect
 */
async function handleTopUp(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const userId = getAuthenticatedUserId(event);
  if (!userId) {
    return unauthorized('Authentication required');
  }

  const body = parseBody(event.body);
  if (!body) {
    return badRequest('Request body is required');
  }

  const { amount } = body as { amount?: number };

  if (typeof amount !== 'number' || !Number.isFinite(amount)) {
    return badRequest('amount is required and must be a number');
  }

  if (amount < MIN_TOPUP_AMOUNT || amount > MAX_TOPUP_AMOUNT) {
    return badRequest(
      `Amount must be between ₦${MIN_TOPUP_AMOUNT.toLocaleString()} and ₦${MAX_TOPUP_AMOUNT.toLocaleString()}`
    );
  }

  // Convert Naira to kobo for Paystack API
  const amountKobo = Math.round(amount * 100);

  // Get user email (placeholder if not available)
  const email =
    event.requestContext?.authorizer?.claims?.email ||
    `user-${userId}@swapsmart.app`;

  // Initialize Paystack transaction
  const paystackResult = await initializeTransaction({
    amountKobo,
    email,
    callbackUrl: PAYSTACK_CALLBACK_URL,
    metadata: {
      userId,
      amountNaira: amount,
      purpose: 'wallet_topup',
    },
  });

  if (!paystackResult.success) {
    return internalError(paystackResult.error || 'Payment initialization failed');
  }

  // Create pending ledger entry
  const pendingResult = await createPendingTopUp(userId, amount, paystackResult.reference!);
  if (!pendingResult.success) {
    return internalError(pendingResult.error || 'Failed to create pending entry');
  }

  return success({
    message: 'Payment initialized',
    authorizationUrl: paystackResult.authorizationUrl,
    accessCode: paystackResult.accessCode,
    reference: paystackResult.reference,
  });
}

/**
 * POST /v1/wallet/topup/callback
 * Paystack webhook handler:
 * 1. Verify HMAC-SHA512 signature using Paystack secret key
 * 2. If signature invalid: reject, log audit entry, return 400
 * 3. If valid + status=success: ConditionExpression check status=PENDING (idempotent),
 *    then TransactWriteItems to update ledger→COMPLETED and increment wallet balance
 * 4. If already processed (condition fails): return 200 (idempotent)
 */
async function handleTopUpCallback(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const rawBody = event.body || '';
  const signature = event.headers['x-paystack-signature'] || event.headers['X-Paystack-Signature'] || '';

  // 1. Verify HMAC-SHA512 signature
  if (!verifyWebhookSignature(rawBody, signature)) {
    console.error('Invalid Paystack webhook signature', {
      ip: event.requestContext?.identity?.sourceIp,
      timestamp: new Date().toISOString(),
    });
    return badRequest('Invalid signature');
  }

  // 2. Parse webhook payload
  const payload = parseBody(rawBody);
  if (!payload) {
    return badRequest('Invalid payload');
  }

  const webhookEvent = payload.event as string;
  const data = payload.data as {
    reference?: string;
    status?: string;
    amount?: number;
    metadata?: { userId?: string; amountNaira?: number };
  };

  // Only process charge.success events
  if (webhookEvent !== 'charge.success' || data?.status !== 'success') {
    return success({ message: 'Event acknowledged' });
  }

  const { reference, metadata } = data;
  if (!reference || !metadata?.userId || !metadata?.amountNaira) {
    return badRequest('Missing required fields in webhook payload');
  }

  const userId = metadata.userId;
  const amount = metadata.amountNaira;

  // 3. Complete the top-up (idempotent)
  const result = await completeTopUp(userId, reference, amount);

  if (!result.success) {
    if (result.code === 'NOT_FOUND') {
      console.error('Pending top-up entry not found for reference:', reference);
      return badRequest('Pending entry not found');
    }
    return internalError(result.error);
  }

  // 4. Emit WalletCredited event (only if not already processed)
  if (result.code !== 'ALREADY_PROCESSED') {
    await emitEvent('WalletCredited', {
      userId,
      amount,
      reference,
      newBalance: result.newBalance,
      timestamp: new Date().toISOString(),
    });
  }

  return success({ message: 'Payment processed' });
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Get authenticated user ID from API Gateway authorizer context
 */
function getAuthenticatedUserId(event: APIGatewayProxyEvent): string | null {
  return (
    event.requestContext?.authorizer?.claims?.['custom:userId'] ||
    event.requestContext?.authorizer?.userId ||
    event.requestContext?.authorizer?.claims?.sub ||
    null
  );
}

/**
 * Emit an event to EventBridge
 */
async function emitEvent(detailType: string, detail: Record<string, unknown>): Promise<void> {
  try {
    await eventBridgeClient.send(
      new PutEventsCommand({
        Entries: [
          {
            Source: 'swapsmart.wallet',
            DetailType: detailType,
            Detail: JSON.stringify(detail),
            EventBusName: EVENT_BUS_NAME,
          },
        ],
      })
    );
  } catch (err) {
    console.error(`Failed to emit ${detailType} event:`, err);
  }
}

/**
 * Parse JSON body from event, returning null if invalid
 */
function parseBody(body: string | null): Record<string, unknown> | null {
  if (!body) return null;
  try {
    return JSON.parse(body) as Record<string, unknown>;
  } catch {
    return null;
  }
}
