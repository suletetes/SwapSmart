import { TransactWriteCommand, QueryCommand, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { docClient, TABLE_NAME, LEDGER_TABLE_NAME } from '../shared/dynamo.js';

export interface CompleteSwapInput {
  reservationId: string;
  stationId: string;
  driverId: string;
  batteryReceivedId: string;
  batteryReturnedId: string;
  amount: number;
  paymentMethod: 'wallet' | 'cash' | 'card';
}

export interface SwapTransaction {
  transactionId: string;
  reservationId: string;
  stationId: string;
  driverId: string;
  batteryReceived: string;
  batteryReturned: string;
  amount: number;
  paymentMethod: string;
  receiptId: string;
  timestamp: string;
  rating?: number;
}

export interface CompleteSwapResult {
  success: boolean;
  transaction?: SwapTransaction;
  error?: string;
  code?: string;
}

/**
 * Start a swap — transition reservation from Arrived to Swapping
 */
export async function startSwap(reservationId: string): Promise<{ success: boolean; error?: string; code?: string }> {
  try {
    await docClient.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { PK: `RESERVATION#${reservationId}`, SK: 'METADATA' },
        UpdateExpression: 'SET #state = :newState, updatedAt = :now',
        ConditionExpression: '#state = :requiredState',
        ExpressionAttributeNames: { '#state': 'state' },
        ExpressionAttributeValues: {
          ':newState': 'Swapping',
          ':requiredState': 'Arrived',
          ':now': new Date().toISOString(),
        },
      })
    );
    return { success: true };
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'name' in err && (err as { name: string }).name === 'ConditionalCheckFailedException') {
      return { success: false, error: 'Reservation is not in Arrived state', code: 'INVALID_STATE' };
    }
    throw err;
  }
}

/**
 * Complete a swap — atomic transaction that:
 * 1. Updates reservation state → Completed
 * 2. Updates received battery state → In_Vehicle
 * 3. Updates returned battery state → Depleted
 * 4. Creates SwapTransaction record
 * 5. If wallet payment: debits wallet balance
 * 6. Creates Ledger_Entry
 */
export async function completeSwap(input: CompleteSwapInput): Promise<CompleteSwapResult> {
  const transactionId = uuidv4();
  const receiptId = uuidv4();
  const now = new Date().toISOString();

  const transaction: SwapTransaction = {
    transactionId,
    reservationId: input.reservationId,
    stationId: input.stationId,
    driverId: input.driverId,
    batteryReceived: input.batteryReceivedId,
    batteryReturned: input.batteryReturnedId,
    amount: input.amount,
    paymentMethod: input.paymentMethod,
    receiptId,
    timestamp: now,
  };

  const transactItems: Array<Record<string, unknown>> = [
    // 1. Update Reservation state → Completed
    {
      Update: {
        TableName: TABLE_NAME,
        Key: { PK: `RESERVATION#${input.reservationId}`, SK: 'METADATA' },
        UpdateExpression: 'SET #state = :completed, completedAt = :now, updatedAt = :now',
        ConditionExpression: '#state = :swapping',
        ExpressionAttributeNames: { '#state': 'state' },
        ExpressionAttributeValues: {
          ':completed': 'Completed',
          ':swapping': 'Swapping',
          ':now': now,
        },
      },
    },
    // 2. Update received battery state → In_Vehicle
    {
      Update: {
        TableName: TABLE_NAME,
        Key: { PK: `STATION#${input.stationId}`, SK: `BATTERY#${input.batteryReceivedId}` },
        UpdateExpression: 'SET #state = :inVehicle, lastSwapTime = :now',
        ExpressionAttributeNames: { '#state': 'state' },
        ExpressionAttributeValues: {
          ':inVehicle': 'In_Vehicle',
          ':now': now,
        },
      },
    },
    // 3. Update returned battery state → Depleted
    {
      Update: {
        TableName: TABLE_NAME,
        Key: { PK: `STATION#${input.stationId}`, SK: `BATTERY#${input.batteryReturnedId}` },
        UpdateExpression: 'SET #state = :depleted, lastSwapTime = :now',
        ExpressionAttributeNames: { '#state': 'state' },
        ExpressionAttributeValues: {
          ':depleted': 'Depleted',
          ':now': now,
        },
      },
    },
    // 4. Create SwapTransaction record
    {
      Put: {
        TableName: TABLE_NAME,
        Item: {
          PK: `STATION#${input.stationId}`,
          SK: `SWAP#${now}#${transactionId}`,
          transactionId,
          reservationId: input.reservationId,
          driverId: input.driverId,
          batteryReceived: input.batteryReceivedId,
          batteryReturned: input.batteryReturnedId,
          amount: input.amount,
          paymentMethod: input.paymentMethod,
          receiptId,
          timestamp: now,
          // GSI4 for receipt lookup
          GSI4PK: `RECEIPT#${receiptId}`,
          GSI4SK: `SWAP#${transactionId}`,
          // GSI1 for driver swap history
          GSI1PK: `USER#${input.driverId}`,
          GSI1SK: `SWAP#${now}`,
        },
      },
    },
  ];

  // 5. If wallet payment: debit wallet balance
  if (input.paymentMethod === 'wallet') {
    transactItems.push({
      Update: {
        TableName: TABLE_NAME,
        Key: { PK: `USER#${input.driverId}`, SK: 'WALLET' },
        UpdateExpression: 'SET balance = balance - :amount, updatedAt = :now',
        ConditionExpression: 'balance >= :amount',
        ExpressionAttributeValues: {
          ':amount': input.amount,
          ':now': now,
        },
      },
    });
  }

  // 6. Create Ledger_Entry in SwapSmart_Ledger table
  const ledgerEntryId = uuidv4();
  transactItems.push({
    Put: {
      TableName: LEDGER_TABLE_NAME,
      Item: {
        PK: `WALLET#${input.driverId}`,
        SK: `ENTRY#${now}#${ledgerEntryId}`,
        type: 'DEBIT',
        amount: input.amount,
        reference: receiptId,
        source: 'SWAP',
        description: `Battery swap at station ${input.stationId}`,
        status: 'COMPLETED',
        timestamp: now,
      },
    },
  });

  try {
    await docClient.send(
      new TransactWriteCommand({ TransactItems: transactItems as any })
    );
    return { success: true, transaction };
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'name' in err) {
      const name = (err as { name: string }).name;
      if (name === 'TransactionCanceledException') {
        // Check if it was a wallet balance issue
        if (input.paymentMethod === 'wallet') {
          return { success: false, error: 'Insufficient wallet balance', code: 'INSUFFICIENT_BALANCE' };
        }
        return { success: false, error: 'Swap transaction failed — reservation may not be in Swapping state', code: 'TRANSACTION_FAILED' };
      }
    }
    throw err;
  }
}

/**
 * Rate a completed swap transaction
 */
export async function rateSwap(
  transactionId: string,
  driverId: string,
  rating: number
): Promise<{ success: boolean; error?: string; code?: string }> {
  // Find the transaction by querying driver's swap history
  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'GSI4-ReceiptLookup',
      KeyConditionExpression: 'GSI4SK = :sk',
      FilterExpression: 'driverId = :driverId',
      ExpressionAttributeValues: {
        ':sk': `SWAP#${transactionId}`,
        ':driverId': driverId,
      },
    })
  );

  if (!result.Items || result.Items.length === 0) {
    return { success: false, error: 'Transaction not found', code: 'NOT_FOUND' };
  }

  const item = result.Items[0];

  try {
    await docClient.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { PK: item.PK as string, SK: item.SK as string },
        UpdateExpression: 'SET rating = :rating, ratedAt = :now',
        ExpressionAttributeValues: {
          ':rating': rating,
          ':now': new Date().toISOString(),
        },
      })
    );
    return { success: true };
  } catch (err) {
    throw err;
  }
}

/**
 * Get swap history for a driver with pagination and optional date range filter
 */
export async function getSwapHistory(
  driverId: string,
  options: { limit?: number; nextToken?: string; startDate?: string; endDate?: string }
): Promise<{ items: SwapTransaction[]; nextToken?: string }> {
  const { limit = 20, nextToken, startDate, endDate } = options;

  let keyCondition = 'GSI1PK = :pk';
  const expressionValues: Record<string, unknown> = {
    ':pk': `USER#${driverId}`,
  };

  // Filter by date range using SK prefix
  if (startDate && endDate) {
    keyCondition += ' AND GSI1SK BETWEEN :start AND :end';
    expressionValues[':start'] = `SWAP#${startDate}`;
    expressionValues[':end'] = `SWAP#${endDate}\uffff`;
  } else if (startDate) {
    keyCondition += ' AND GSI1SK >= :start';
    expressionValues[':start'] = `SWAP#${startDate}`;
  } else if (endDate) {
    keyCondition += ' AND GSI1SK <= :end';
    expressionValues[':end'] = `SWAP#${endDate}\uffff`;
  } else {
    keyCondition += ' AND begins_with(GSI1SK, :prefix)';
    expressionValues[':prefix'] = 'SWAP#';
  }

  const queryParams: Record<string, unknown> = {
    TableName: TABLE_NAME,
    IndexName: 'GSI1-DriverReservations',
    KeyConditionExpression: keyCondition,
    ExpressionAttributeValues: expressionValues,
    Limit: limit,
    ScanIndexForward: false, // Most recent first
  };

  if (nextToken) {
    queryParams.ExclusiveStartKey = JSON.parse(Buffer.from(nextToken, 'base64').toString());
  }

  const result = await docClient.send(new QueryCommand(queryParams as any));

  const items: SwapTransaction[] = (result.Items || []).map((item) => ({
    transactionId: item.transactionId as string,
    reservationId: item.reservationId as string,
    stationId: (item.PK as string).replace('STATION#', ''),
    driverId: item.driverId as string,
    batteryReceived: item.batteryReceived as string,
    batteryReturned: item.batteryReturned as string,
    amount: item.amount as number,
    paymentMethod: item.paymentMethod as string,
    receiptId: item.receiptId as string,
    timestamp: item.timestamp as string,
    rating: item.rating as number | undefined,
  }));

  let resultNextToken: string | undefined;
  if (result.LastEvaluatedKey) {
    resultNextToken = Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64');
  }

  return { items, nextToken: resultNextToken };
}

/**
 * Get a reservation by ID
 */
export async function getReservation(reservationId: string): Promise<Record<string, unknown> | null> {
  const result = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: `RESERVATION#${reservationId}`, SK: 'METADATA' },
    })
  );
  return result.Item ?? null;
}
