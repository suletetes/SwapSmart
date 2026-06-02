import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { z } from 'zod';
import {
  success,
  badRequest,
  notFound,
  internalError,
} from '../shared/response.js';
import {
  queryNearbyStations,
  getStationById,
  updateStationAvailability,
  getStationTotalSlots,
} from './station.service.js';
import { getRedisClient } from '../shared/redis.js';

/** Validation schemas */
const nearbyStationsSchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radius: z.coerce.number().min(0.1).max(50).default(5), // km, default 5km
});

/** IoT battery state change event shape */
interface BatteryStateChangeEvent {
  source: string;
  'detail-type': string;
  detail: {
    stationId: string;
    batteryId: string;
    previousState: string;
    newState: string;
    chargeLevel?: number;
    timestamp: string;
  };
}

/**
 * Availability Service Lambda Handler
 * Handles station queries and IoT battery state change events.
 */
export async function handler(
  event: APIGatewayProxyEvent | BatteryStateChangeEvent
): Promise<APIGatewayProxyResult | void> {
  // Check if this is an EventBridge/IoT event
  if ('detail-type' in event && 'detail' in event) {
    return handleBatteryStateChange(event as BatteryStateChangeEvent);
  }

  // HTTP API request
  const apiEvent = event as APIGatewayProxyEvent;
  const { httpMethod, path, pathParameters } = apiEvent;

  try {
    if (httpMethod === 'GET' && path === '/v1/stations') {
      return handleGetNearbyStations(apiEvent);
    }

    if (httpMethod === 'GET' && path.match(/^\/v1\/stations\/[^/]+$/)) {
      const stationId = pathParameters?.stationId || path.split('/').pop()!;
      return handleGetStationDetail(stationId);
    }

    if (httpMethod === 'OPTIONS') {
      return success({ message: 'OK' });
    }

    return notFound('Route not found');
  } catch (err) {
    console.error('Availability handler error:', err);
    return internalError();
  }
}

/**
 * GET /v1/stations
 * Query nearby stations by lat/lng/radius using geohash prefix matching.
 */
async function handleGetNearbyStations(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  const params = event.queryStringParameters || {};

  const validation = nearbyStationsSchema.safeParse(params);
  if (!validation.success) {
    const errors = validation.error.flatten().fieldErrors;
    return badRequest('Invalid query parameters', errors);
  }

  const { lat, lng, radius } = validation.data;

  const stations = await queryNearbyStations(lat, lng, radius);

  return success({
    stations: stations.map((s) => ({
      stationId: s.stationId,
      name: s.name,
      address: s.address,
      lat: s.lat,
      lng: s.lng,
      totalSlots: s.totalSlots,
      available: s.realTimeAvailable,
      pricePerSwap: s.pricePerSwap,
      rating: s.rating,
      status: s.status,
      lastUpdated: s.lastUpdated,
    })),
    count: stations.length,
  });
}

/**
 * GET /v1/stations/{stationId}
 * Return full station detail with real-time available count.
 */
async function handleGetStationDetail(stationId: string): Promise<APIGatewayProxyResult> {
  if (!stationId) {
    return badRequest('Station ID is required');
  }

  const station = await getStationById(stationId);
  if (!station) {
    return notFound('Station not found');
  }

  return success({
    stationId: station.stationId,
    name: station.name,
    address: station.address,
    lat: station.lat,
    lng: station.lng,
    totalSlots: station.totalSlots,
    available: station.realTimeAvailable,
    operatorId: station.operatorId,
    hours: station.hours,
    pricePerSwap: station.pricePerSwap,
    rating: station.rating,
    status: station.status,
    lastUpdated: station.lastUpdated,
  });
}

/**
 * Handle IoT Core battery state change events via EventBridge.
 * Updates Redis availability count and publishes WebSocket update.
 */
async function handleBatteryStateChange(event: BatteryStateChangeEvent): Promise<void> {
  const { stationId, previousState, newState, timestamp } = event.detail;

  console.log(`Battery state change: station=${stationId}, ${previousState} → ${newState}`);

  // Determine availability delta based on state transition
  const delta = computeAvailabilityDelta(previousState, newState);

  if (delta !== 0) {
    const totalSlots = await getStationTotalSlots(stationId);
    const newAvailable = await updateStationAvailability(stationId, delta, totalSlots);

    console.log(`Station ${stationId} availability updated: ${newAvailable}/${totalSlots}`);

    // Publish WebSocket update to connected clients
    await publishWebSocketUpdate(stationId, newAvailable, totalSlots, timestamp);
  }
}

/**
 * Compute the availability delta based on battery state transition.
 * A battery becoming Ready increases availability; leaving Ready decreases it.
 */
function computeAvailabilityDelta(previousState: string, newState: string): number {
  let delta = 0;

  // Battery became Ready → +1 available
  if (newState === 'Ready' && previousState !== 'Ready') {
    delta = 1;
  }

  // Battery left Ready state → -1 available
  if (previousState === 'Ready' && newState !== 'Ready') {
    delta = -1;
  }

  return delta;
}

/**
 * Publish real-time availability update to WebSocket connected clients.
 * Uses Redis pub/sub for fan-out to WebSocket connection manager.
 */
async function publishWebSocketUpdate(
  stationId: string,
  available: number,
  totalSlots: number,
  timestamp: string
): Promise<void> {
  try {
    const redis = getRedisClient();
    const message = JSON.stringify({
      channel: `station/${stationId}/availability`,
      data: {
        available,
        totalSlots,
        charging: totalSlots - available, // simplified
        timestamp,
      },
    });

    // Publish to Redis channel for WebSocket fan-out
    await redis.publish(`ws:station:${stationId}`, message);
  } catch (err) {
    console.error('Failed to publish WebSocket update:', err);
    // Non-fatal: availability is still updated in Redis
  }
}
