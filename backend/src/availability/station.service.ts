import { QueryCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLE_NAME } from '../shared/dynamo.js';
import { getRedisClient } from '../shared/redis.js';

export interface Station {
  stationId: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  geohash: string;
  totalSlots: number;
  availableCount: number;
  operatorId: string;
  hours: string;
  pricePerSwap: number;
  rating: number;
  status: string;
}

export interface StationWithAvailability extends Station {
  realTimeAvailable: number;
  lastUpdated: string;
}

/**
 * Compute a geohash prefix from lat/lng at a given precision.
 * Uses a simplified base-32 geohash encoding.
 */
export function computeGeohash(lat: number, lng: number, precision = 5): string {
  const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';
  let minLat = -90, maxLat = 90;
  let minLng = -180, maxLng = 180;
  let hash = '';
  let isEven = true;
  let bit = 0;
  let ch = 0;

  while (hash.length < precision) {
    if (isEven) {
      const mid = (minLng + maxLng) / 2;
      if (lng >= mid) {
        ch = ch | (1 << (4 - bit));
        minLng = mid;
      } else {
        maxLng = mid;
      }
    } else {
      const mid = (minLat + maxLat) / 2;
      if (lat >= mid) {
        ch = ch | (1 << (4 - bit));
        minLat = mid;
      } else {
        maxLat = mid;
      }
    }
    isEven = !isEven;
    if (bit < 4) {
      bit++;
    } else {
      hash += BASE32[ch];
      bit = 0;
      ch = 0;
    }
  }
  return hash;
}

/**
 * Calculate distance between two points using Haversine formula (returns km).
 */
export function haversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Query nearby stations by geohash prefix matching.
 * Uses a scan with geohash prefix filter (for hackathon demo; production would use GSI).
 */
export async function queryNearbyStations(
  lat: number,
  lng: number,
  radiusKm: number
): Promise<StationWithAvailability[]> {
  const geohashPrefix = computeGeohash(lat, lng, 4); // 4-char prefix for ~20km area

  // Query stations by geohash prefix using begins_with on SK
  // In single-table design, stations have PK=STATION#{id}, SK=METADATA
  // We use a scan with filter for geohash prefix (acceptable for hackathon scale)
  const { Items } = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'GSI2-StationReservations',
      KeyConditionExpression: 'GSI2PK = :pk AND begins_with(GSI2SK, :prefix)',
      ExpressionAttributeValues: {
        ':pk': `GEOHASH#${geohashPrefix}`,
        ':prefix': 'STATION#',
      },
    })
  );

  if (!Items || Items.length === 0) {
    // Fallback: scan all stations and filter by distance
    return queryAllStationsWithinRadius(lat, lng, radiusKm);
  }

  const stations = Items as unknown as Station[];
  return enrichStationsWithAvailability(stations, lat, lng, radiusKm);
}

/**
 * Fallback: Query all stations and filter by distance.
 * Suitable for hackathon demo with limited station count.
 */
async function queryAllStationsWithinRadius(
  lat: number,
  lng: number,
  radiusKm: number
): Promise<StationWithAvailability[]> {
  // Scan for all station metadata items
  const { ScanCommand } = await import('@aws-sdk/lib-dynamodb');

  const { Items } = await docClient.send(
    new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: 'SK = :sk AND begins_with(PK, :pk)',
      ExpressionAttributeValues: {
        ':sk': 'METADATA',
        ':pk': 'STATION#',
      },
    })
  );

  if (!Items || Items.length === 0) {
    return [];
  }

  const stations = Items as unknown as Station[];
  return enrichStationsWithAvailability(stations, lat, lng, radiusKm);
}

/**
 * Enrich stations with real-time availability from Redis and filter by radius.
 */
async function enrichStationsWithAvailability(
  stations: Station[],
  lat: number,
  lng: number,
  radiusKm: number
): Promise<StationWithAvailability[]> {
  const redis = getRedisClient();
  const results: StationWithAvailability[] = [];

  for (const station of stations) {
    const distance = haversineDistance(lat, lng, station.lat, station.lng);
    if (distance > radiusKm) continue;

    const availableStr = await redis.get(`station:${station.stationId}:available`);
    const realTimeAvailable = availableStr !== null
      ? clampAvailability(parseInt(availableStr, 10), station.totalSlots)
      : station.availableCount;

    const lastUpdatedStr = await redis.get(`station:${station.stationId}:lastUpdated`);

    results.push({
      ...station,
      realTimeAvailable,
      lastUpdated: lastUpdatedStr || new Date().toISOString(),
    });
  }

  // Sort by distance
  results.sort((a, b) => {
    const distA = haversineDistance(lat, lng, a.lat, a.lng);
    const distB = haversineDistance(lat, lng, b.lat, b.lng);
    return distA - distB;
  });

  return results;
}

/**
 * Get a single station by ID with real-time availability.
 */
export async function getStationById(stationId: string): Promise<StationWithAvailability | null> {
  const { Item } = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `STATION#${stationId}`,
        SK: 'METADATA',
      },
    })
  );

  if (!Item) return null;

  const station = Item as unknown as Station;
  const redis = getRedisClient();

  const availableStr = await redis.get(`station:${station.stationId}:available`);
  const realTimeAvailable = availableStr !== null
    ? clampAvailability(parseInt(availableStr, 10), station.totalSlots)
    : station.availableCount;

  const lastUpdatedStr = await redis.get(`station:${station.stationId}:lastUpdated`);

  return {
    ...station,
    realTimeAvailable,
    lastUpdated: lastUpdatedStr || new Date().toISOString(),
  };
}

/**
 * Update station availability in Redis when battery state changes.
 * Called from IoT Core event handler.
 */
export async function updateStationAvailability(
  stationId: string,
  delta: number,
  totalSlots: number
): Promise<number> {
  const redis = getRedisClient();
  const key = `station:${stationId}:available`;

  // Atomically adjust the count
  let newCount: number;
  if (delta > 0) {
    newCount = await redis.incrby(key, delta);
  } else {
    newCount = await redis.decrby(key, Math.abs(delta));
  }

  // Clamp to valid range [0, totalSlots]
  const clamped = clampAvailability(newCount, totalSlots);
  if (clamped !== newCount) {
    await redis.set(key, clamped.toString());
    newCount = clamped;
  }

  // Update last-updated timestamp
  await redis.set(`station:${stationId}:lastUpdated`, new Date().toISOString());

  return newCount;
}

/**
 * Clamp availability count to valid range [0, totalSlots].
 */
export function clampAvailability(count: number, totalSlots: number): number {
  if (count < 0) return 0;
  if (count > totalSlots) return totalSlots;
  return count;
}

/**
 * Get total slots for a station from DynamoDB.
 */
export async function getStationTotalSlots(stationId: string): Promise<number> {
  const { Item } = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `STATION#${stationId}`,
        SK: 'METADATA',
      },
      ProjectionExpression: 'totalSlots',
    })
  );

  return (Item?.totalSlots as number) || 0;
}
