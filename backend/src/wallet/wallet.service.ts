import { TransactWriteCommand, QueryCommand, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { docClient, TABLE_NAME, LEDGER_TABLE_NAME } from '../shared/dynamo.js';

export interface WalletBalance {
  userId: string;
  balance: number;
  updatedAt: string;
}

export interface LedgerEntry {
  entryId: string;
  type: 'CREDIT' | 'DEBIT';
  amount: number;
  reference: string;
  source: string;
  description: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  timestamp: string;
  balanceAfter?: number;
}

export interface TopUpResult {
  success: boolean;
  reference?: string;
  error?: string;
  code?: string;
}

export interface CreditResult {
  success: boolean;
  newBalance?: number;
  error?: string;
  code?: string;
}

/**
 * Get wallet balance for a user
 */
export async function getWalletBalance(userId: string): Promise<WalletBalance> {
  const result = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: `USER#${userId}`, SK: 'WALLET' },
    })
  );

  if (!result.Item) {
    // Return zero balance if wallet doesn't exist yet
    return { userId, balance: 0, updatedAt: new Date().toISOString() };
  }

  return {
    userId,
    balance: (result.Item.balance as number) || 0,
    updatedAt: (result.Item.updatedAt as string) || new Date().toISOString(),
  };
}

/**
 * Get recent ledger entries for a user (most recent first)
 */
export async function getLedgerEntries(
  userId: string,
  limit = 20
): Promise<LedgerEntry[]> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: LEDGER_TABLE_NAME,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: {
        ':pk': `WALLET#${userId}`,
      },
      Limit: limit,
      ScanIndexForward: false, // Most recent first
    })
  );

  return (result.Items || []).map((item) => ({
    entryId: item.entryId as string || (item.SK as string).split('#').pop() || '',
    type: item.type as 'CREDIT' | 'DEBIT',
    amount: item.amount as number,
    reference: item.reference as string,
    source: item.source as string,
    description: item.description as string,
    status: item.status as 'PENDING' | 'COMPLETED' | 'FAILED',
    timestamp: item.timestamp as string,
    balanceAfter: item.balanceAfter as number | undefined,
  }));
}

/**
 * Create a pending ledger entry for a top-up (before Paystack confirms)
 */
export async function createPendingTopUp(
  userId: string,
  amount: number,
  reference: string
): Promise<TopUpResult> {
  const now = new Date().toISOString();
  const entryId = uuidv4();

  try {
    await docClient.send(
      new PutCommand({
        TableName: LEDGER_TABLE_NAME,
        Item: {
          PK: `WALLET#${userId}`,
          SK: `ENTRY#${now}#${entryId}`,
          entryId,
          type: 'CREDIT',
          amount,
          reference,
          source: 'PAYSTACK_TOPUP',
          description: `Wallet top-up ₦${amount.toLocaleString()}`,
          status: 'PENDING',
          timestamp: now,
          userId,
        },
        ConditionExpression: 'attribute_not_exists(PK)',
      })
    );

    return { success: true, reference };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create pending entry';
    return { success: false, error: message };
  }
}

/**
 * Complete a top-up: update ledger entry to COMPLETED and increment wallet balance.
 * Uses ConditionExpression on status=PENDING for idempotency.
 * Returns success even if already processed (idempotent).
 */
export async function completeTopUp(
  userId: string,
  reference: string,
  amount: number
): Promise<CreditResult> {
  const now = new Date().toISOString();

  // Find the pending ledger entry by reference
  const ledgerResult = await docClient.send(
    new QueryCommand({
      TableName: LEDGER_TABLE_NAME,
      KeyConditionExpression: 'PK = :pk',
      FilterExpression: '#ref = :reference AND #status = :pending',
      ExpressionAttributeNames: {
        '#ref': 'reference',
        '#status': 'status',
      },
      ExpressionAttributeValues: {
        ':pk': `WALLET#${userId}`,
        ':reference': reference,
        ':pending': 'PENDING',
      },
    })
  );

  if (!ledgerResult.Items || ledgerResult.Items.length === 0) {
    // Either already processed (idempotent) or not found
    // Check if it exists with COMPLETED status
    const completedCheck = await docClient.send(
      new QueryCommand({
        TableName: LEDGER_TABLE_NAME,
        KeyConditionExpression: 'PK = :pk',
        FilterExpression: '#ref = :reference AND #status = :completed',
        ExpressionAttributeNames: {
          '#ref': 'reference',
          '#status': 'status',
        },
        ExpressionAttributeValues: {
          ':pk': `WALLET#${userId}`,
          ':reference': reference,
          ':completed': 'COMPLETED',
        },
      })
    );

    if (completedCheck.Items && completedCheck.Items.length > 0) {
      // Already processed — idempotent success
      return { success: true, code: 'ALREADY_PROCESSED' };
    }

    return { success: false, error: 'Pending top-up entry not found', code: 'NOT_FOUND' };
  }

  const pendingEntry = ledgerResult.Items[0];

  // Atomic transaction: update ledger → COMPLETED + increment wallet balance
  try {
    // First, ensure wallet record exists
    await ensureWalletExists(userId);

    await docClient.send(
      new TransactWriteCommand({
        TransactItems: [
          // Update ledger entry status to COMPLETED
          {
            Update: {
              TableName: LEDGER_TABLE_NAME,
              Key: { PK: pendingEntry.PK as string, SK: pendingEntry.SK as string },
              UpdateExpression: 'SET #status = :completed, completedAt = :now',
              ConditionExpression: '#status = :pending',
              ExpressionAttributeNames: { '#status': 'status' },
              ExpressionAttributeValues: {
                ':completed': 'COMPLETED',
                ':pending': 'PENDING',
                ':now': now,
              },
            },
          },
          // Increment wallet balance
          {
            Update: {
              TableName: TABLE_NAME,
              Key: { PK: `USER#${userId}`, SK: 'WALLET' },
              UpdateExpression: 'SET balance = balance + :amount, updatedAt = :now',
              ExpressionAttributeValues: {
                ':amount': amount,
                ':now': now,
              },
            },
          },
        ],
      })
    );

    // Get updated balance
    const wallet = await getWalletBalance(userId);
    return { success: true, newBalance: wallet.balance };
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'name' in err) {
      const name = (err as { name: string }).name;
      if (name === 'TransactionCanceledException') {
        // Condition check failed — likely already processed (idempotent)
        return { success: true, code: 'ALREADY_PROCESSED' };
      }
    }
    throw err;
  }
}

/**
 * Debit wallet balance (used by swap service).
 * Enforces non-negative balance with ConditionExpression.
 */
export async function debitWallet(
  userId: string,
  amount: number,
  reference: string,
  description: string
): Promise<{ success: boolean; newBalance?: number; error?: string; code?: string }> {
  const now = new Date().toISOString();
  const entryId = uuidv4();

  try {
    await docClient.send(
      new TransactWriteCommand({
        TransactItems: [
          // Debit wallet balance (ConditionExpression: balance >= amount)
          {
            Update: {
              TableName: TABLE_NAME,
              Key: { PK: `USER#${userId}`, SK: 'WALLET' },
              UpdateExpression: 'SET balance = balance - :amount, updatedAt = :now',
              ConditionExpression: 'balance >= :amount',
              ExpressionAttributeValues: {
                ':amount': amount,
                ':now': now,
              },
            },
          },
          // Create ledger entry
          {
            Put: {
              TableName: LEDGER_TABLE_NAME,
              Item: {
                PK: `WALLET#${userId}`,
                SK: `ENTRY#${now}#${entryId}`,
                entryId,
                type: 'DEBIT',
                amount,
                reference,
                source: 'SWAP',
                description,
                status: 'COMPLETED',
                timestamp: now,
                userId,
              },
            },
          },
        ],
      })
    );

    const wallet = await getWalletBalance(userId);
    return { success: true, newBalance: wallet.balance };
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'name' in err) {
      const name = (err as { name: string }).name;
      if (name === 'TransactionCanceledException') {
        return { success: false, error: 'Insufficient wallet balance', code: 'INSUFFICIENT_BALANCE' };
      }
    }
    throw err;
  }
}

/**
 * Ensure a wallet record exists for the user (initialize with 0 balance if not)
 */
async function ensureWalletExists(userId: string): Promise<void> {
  const now = new Date().toISOString();
  try {
    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: {
          PK: `USER#${userId}`,
          SK: 'WALLET',
          balance: 0,
          createdAt: now,
          updatedAt: now,
        },
        ConditionExpression: 'attribute_not_exists(PK)',
      })
    );
  } catch (err: unknown) {
    // If wallet already exists, that's fine
    if (err && typeof err === 'object' && 'name' in err && (err as { name: string }).name === 'ConditionalCheckFailedException') {
      return;
    }
    throw err;
  }
}
