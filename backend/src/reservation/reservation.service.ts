import {
  QueryCommand,
  GetCommand,
  UpdateCommand,
  TransactWriteCommand,
} from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { docClient, TABLE_NAME } from '../shared/dynamo.js';
import { getRedisClient } from '../shared/redis.js';
import { ReservationState, validateTransition } from './state-machine.js';

export interface Reservation {
  reservationId: string;
  driverId: string;
  stationId: string;
  batteryId: string;
  state: ReservationState;
  createdAt: string;
  expiresAt: string;
  extensionCount: number;
  swapCode?: string;
}

export interface CreateReservationInput {
  driverId: string;
  stationId: string;
}

export interface CreateReservationResult {
  success: boolean;
  reservation?: Reservation;
  error?: string;
  code?: string;
}

const RESERVATION_HOLD_MINUTES = 15;
const LOCK_TTL_SECONDS = 5;

/**
 * Create a reservation atomically:
 * 1. Check driver doesn't already have an active reservation (GSI1 query)
 * 2. Redis distributed lock on station:{id}:lock (5s TTL)
 * 3. Redis DECR on station:{id}:available (check >= 0, else INCR back)
 * 4. DynamoDB TransactWriteItems: Create Reservation + Update Battery
 * 5. Emit ReservationCreated event to EventBridge
 */
export async function createReservation(
  input: CreateReservationInput
): Promise<CreateReservationResult> {
  const { driverId, stationId } = input;
  const redis = getRedisClient();

  // Step 1: Check for existing active reservation
  const existingReservation = await getActiveReservation(driverId);
  if (existingReservation) {
    return {
      success: false,
      error: 'You already have an active reservation',
      code: 'ACTIVE_RESERVATION_EXISTS',
    };
  }

  // Step 2: Acquire distributed lock
  const lockKey = `station:${stationId}:lock`;
  const lockValue = uuidv4();
  const lockAcquired = await redis.set(lockKey, lockValue, 'EX', LOCK_TTL_SECONDS, 'NX');

  if (!lockAcquired) {
    return {
      success: false,
      error: 'Station is busy, please try again',
      code: 'LOCK_CONTENTION',
    };
  }

  try {
    // Step 3: Decrement available count atomically
    const availableKey = `station:${stationId}:available`;
    const newCount = await redis.decr(availableKey);

    if (newCount < 0) {
      // No batteries available — roll back
      await redis.incr(availableKey);
      return {
        success: false,
        error: 'No batteries available at this station',
        code: 'NO_AVAILABILITY',
      };
    }

    // Find an available battery at the station
    const batteryId = await findAvailableBattery(stationId);
    if (!batteryId) {
      // Roll back Redis count
      await redis.incr(availableKey);
      return {
        success: false,
        error: 'No batteries available at this station',
        code: 'NO_AVAILABILITY',
      };
    }

    // Step 4: DynamoDB TransactWriteItems
    const reservationId = uuidv4();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + RESERVATION_HOLD_MINUTES * 60 * 1000);

    const reservation: Reservation = {
      reservationId,
      driverId,
      stationId,
      batteryId,
      state: 'Active',
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      extensionCount: 0,
    };

    await docClient.send(
      new TransactWriteCommand({
        TransactItems: [
          {
            Put: {
              TableName: TABLE_NAME,
              Item: {
                PK: `RESERVATION#${reservationId}`,
                SK: 'METADATA',
                ...reservation,
                // GSI1: Driver's reservations by state
                GSI1PK: `USER#${driverId}`,
                GSI1SK: `RESERVATION#Active#${now.toISOString()}`,
                // GSI2: Station's reservation queue
                GSI2PK: `STATION#${stationId}`,
                GSI2SK: `RESV_STATE#Active#${now.toISOString()}`,
              },
              ConditionExpression: 'attribute_not_exists(PK)',
            },
          },
          {
            Update: {
              TableName: TABLE_NAME,
              Key: {
                PK: `STATION#${stationId}`,
                SK: `BATTERY#${batteryId}`,
              },
              UpdateExpression: 'SET #state = :reserved, reservationId = :resId',
              ConditionExpression: '#state = :ready',
              ExpressionAttributeNames: { '#state': 'state' },
              ExpressionAttributeValues: {
                ':reserved': 'Reserved',
                ':resId': reservationId,
                ':ready': 'Ready',
              },
            },
          },
        ],
      })
    );

    // Update last-updated timestamp
    await redis.set(`station:${stationId}:lastUpdated`, now.toISOString());

    // Step 5: Emit EventBridge event (fire-and-forget)
    await emitReservationEvent('ReservationCreated', reservation);

    return { success: true, reservation };
  } catch (err: any) {
    // Roll back Redis on DynamoDB failure
    await redis.incr(`station:${stationId}:available`);
    console.error('Reservation creation failed:', err);

    if (err.name === 'TransactionCanceledException') {
      return {
        success: false,
        error: 'Battery is no longer available',
        code: 'TRANSACTION_CONFLICT',
      };
    }

    return {
      success: false,
      error: 'Failed to create reservation',
      code: 'INTERNAL_ERROR',
    };
  } finally {
    // Release lock (only if we still own it)
    const currentLock = await redis.get(lockKey);
    if (currentLock === lockValue) {
      await redis.del(lockKey);
    }
  }
}

/**
 * Get the active (non-terminal) reservation for a driver.
 * Queries GSI1 for reservations in Active, EnRoute, or Arrived state.
 */
export async function getActiveReservation(driverId: string): Promise<Reservation | null> {
  const activeStates: ReservationState[] = ['Active', 'EnRoute', 'Arrived', 'Swapping'];

  for (const state of activeStates) {
    const { Items } = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: 'GSI1-DriverReservations',
        KeyConditionExpression: 'GSI1PK = :pk AND begins_with(GSI1SK, :prefix)',
        ExpressionAttributeValues: {
          ':pk': `USER#${driverId}`,
          ':prefix': `RESERVATION#${state}#`,
        },
        Limit: 1,
      })
    );

    if (Items && Items.length > 0) {
      return Items[0] as unknown as Reservation;
    }
  }

  return null;
}

/**
 * Get a reservation by ID.
 */
export async function getReservationById(reservationId: string): Promise<Reservation | null> {
  const { Item } = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `RESERVATION#${reservationId}`,
        SK: 'METADATA',
      },
    })
  );

  return Item ? (Item as unknown as Reservation) : null;
}

/**
 * Transition reservation to Arrived state and generate swap code.
 * Validates current state is Active or EnRoute.
 */
export async function arriveAtStation(
  reservationId: string,
  driverId: string
): Promise<{ success: boolean; swapCode?: string; error?: string; code?: string }> {
  const reservation = await getReservationById(reservationId);

  if (!reservation) {
    return { success: false, error: 'Reservation not found', code: 'NOT_FOUND' };
  }

  if (reservation.driverId !== driverId) {
    return { success: false, error: 'Reservation not found', code: 'NOT_FOUND' };
  }

  const transitionResult = validateTransition(reservation.state, 'Arrived');
  if (!transitionResult.valid) {
    return { success: false, error: transitionResult.reason, code: 'INVALID_STATE' };
  }

  // Generate 4-digit swap code
  const swapCode = generateSwapCode();
  const now = new Date().toISOString();

  await docClient.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `RESERVATION#${reservationId}`,
        SK: 'METADATA',
      },
      UpdateExpression: 'SET #state = :arrived, swapCode = :code, arrivedAt = :now, GSI1SK = :gsi1sk, GSI2SK = :gsi2sk',
      ExpressionAttributeNames: { '#state': 'state' },
      ExpressionAttributeValues: {
        ':arrived': 'Arrived',
        ':code': swapCode,
        ':now': now,
        ':gsi1sk': `RESERVATION#Arrived#${reservation.createdAt}`,
        ':gsi2sk': `RESV_STATE#Arrived#${reservation.createdAt}`,
      },
    })
  );

  await emitReservationEvent('ReservationArrived', { ...reservation, state: 'Arrived', swapCode });

  return { success: true, swapCode };
}

/**
 * Cancel a reservation. Validates state allows cancellation.
 * Releases battery back to Ready and increments available count.
 */
export async function cancelReservation(
  reservationId: string,
  driverId: string
): Promise<{ success: boolean; error?: string; code?: string }> {
  const reservation = await getReservationById(reservationId);

  if (!reservation) {
    return { success: false, error: 'Reservation not found', code: 'NOT_FOUND' };
  }

  if (reservation.driverId !== driverId) {
    return { success: false, error: 'Reservation not found', code: 'NOT_FOUND' };
  }

  const transitionResult = validateTransition(reservation.state, 'Cancelled');
  if (!transitionResult.valid) {
    return { success: false, error: transitionResult.reason, code: 'INVALID_STATE' };
  }

  const now = new Date().toISOString();

  // Transactional update: Cancel reservation + release battery
  await docClient.send(
    new TransactWriteCommand({
      TransactItems: [
        {
          Update: {
            TableName: TABLE_NAME,
            Key: {
              PK: `RESERVATION#${reservationId}`,
              SK: 'METADATA',
            },
            UpdateExpression: 'SET #state = :cancelled, cancelledAt = :now, GSI1SK = :gsi1sk, GSI2SK = :gsi2sk',
            ExpressionAttributeNames: { '#state': 'state' },
            ExpressionAttributeValues: {
              ':cancelled': 'Cancelled',
              ':now': now,
              ':gsi1sk': `RESERVATION#Cancelled#${reservation.createdAt}`,
              ':gsi2sk': `RESV_STATE#Cancelled#${reservation.createdAt}`,
            },
          },
        },
        {
          Update: {
            TableName: TABLE_NAME,
            Key: {
              PK: `STATION#${reservation.stationId}`,
              SK: `BATTERY#${reservation.batteryId}`,
            },
            UpdateExpression: 'SET #state = :ready, reservationId = :empty',
            ExpressionAttributeNames: { '#state': 'state' },
            ExpressionAttributeValues: {
              ':ready': 'Ready',
              ':empty': '',
            },
          },
        },
      ],
    })
  );

  // Increment available count in Redis
  const redis = getRedisClient();
  await redis.incr(`station:${reservation.stationId}:available`);
  await redis.set(`station:${reservation.stationId}:lastUpdated`, now);

  await emitReservationEvent('ReservationCancelled', { ...reservation, state: 'Cancelled' });

  return { success: true };
}

/**
 * Find an available (Ready) battery at a station.
 */
async function findAvailableBattery(stationId: string): Promise<string | null> {
  const { Items } = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
      FilterExpression: '#state = :ready',
      ExpressionAttributeNames: { '#state': 'state' },
      ExpressionAttributeValues: {
        ':pk': `STATION#${stationId}`,
        ':prefix': 'BATTERY#',
        ':ready': 'Ready',
      },
      Limit: 1,
    })
  );

  if (!Items || Items.length === 0) return null;
  return (Items[0] as any).batteryId || Items[0].SK?.replace('BATTERY#', '') || null;
}

/**
 * Generate a 4-digit swap code.
 */
function generateSwapCode(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

/**
 * Emit a reservation event to EventBridge.
 */
async function emitReservationEvent(
  detailType: string,
  reservation: Partial<Reservation>
): Promise<void> {
  try {
    const { EventBridgeClient, PutEventsCommand } = await import('@aws-sdk/client-eventbridge');
    const ebClient = new EventBridgeClient({
      region: process.env.AWS_REGION || 'af-south-1',
    });

    await ebClient.send(
      new PutEventsCommand({
        Entries: [
          {
            Source: 'swapsmart.reservation',
            DetailType: detailType,
            Detail: JSON.stringify(reservation),
            EventBusName: process.env.EVENT_BUS_NAME || 'swapsmart-events-dev',
          },
        ],
      })
    );
  } catch (err) {
    console.error(`Failed to emit ${detailType} event:`, err);
    // Non-fatal: reservation is still created/updated
  }
}
