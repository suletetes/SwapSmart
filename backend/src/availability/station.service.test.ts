import { describe, it, expect } from 'vitest';
import { computeGeohash, haversineDistance, clampAvailability } from './station.service.js';

describe('Station Service - Pure Functions', () => {
  describe('computeGeohash', () => {
    it('returns a string of the specified precision', () => {
      const hash = computeGeohash(6.5244, 3.3792, 5); // Lagos coordinates
      expect(hash).toHaveLength(5);
    });

    it('returns consistent results for same coordinates', () => {
      const hash1 = computeGeohash(6.5244, 3.3792, 5);
      const hash2 = computeGeohash(6.5244, 3.3792, 5);
      expect(hash1).toBe(hash2);
    });

    it('returns different hashes for distant locations', () => {
      const lagosHash = computeGeohash(6.5244, 3.3792, 5);
      const londonHash = computeGeohash(51.5074, -0.1278, 5);
      expect(lagosHash).not.toBe(londonHash);
    });

    it('returns similar prefixes for nearby locations', () => {
      // Two points in Lagos, ~1km apart
      const hash1 = computeGeohash(6.5244, 3.3792, 4);
      const hash2 = computeGeohash(6.5250, 3.3800, 4);
      // At precision 4, nearby points should share prefix
      expect(hash1.substring(0, 3)).toBe(hash2.substring(0, 3));
    });

    it('handles edge coordinates', () => {
      expect(computeGeohash(0, 0, 5)).toHaveLength(5);
      expect(computeGeohash(-90, -180, 5)).toHaveLength(5);
      expect(computeGeohash(90, 180, 5)).toHaveLength(5);
    });
  });

  describe('haversineDistance', () => {
    it('returns 0 for same point', () => {
      const dist = haversineDistance(6.5244, 3.3792, 6.5244, 3.3792);
      expect(dist).toBe(0);
    });

    it('calculates reasonable distance between Lagos locations', () => {
      // Ikeja to Victoria Island (~15km)
      const dist = haversineDistance(6.6018, 3.3515, 6.4281, 3.4219);
      expect(dist).toBeGreaterThan(10);
      expect(dist).toBeLessThan(25);
    });

    it('calculates long distance correctly', () => {
      // Lagos to London (~5100km)
      const dist = haversineDistance(6.5244, 3.3792, 51.5074, -0.1278);
      expect(dist).toBeGreaterThan(5000);
      expect(dist).toBeLessThan(5200);
    });

    it('is symmetric', () => {
      const d1 = haversineDistance(6.5244, 3.3792, 51.5074, -0.1278);
      const d2 = haversineDistance(51.5074, -0.1278, 6.5244, 3.3792);
      expect(d1).toBeCloseTo(d2, 10);
    });
  });

  describe('clampAvailability', () => {
    it('returns count when within bounds', () => {
      expect(clampAvailability(5, 10)).toBe(5);
    });

    it('clamps negative to 0', () => {
      expect(clampAvailability(-1, 10)).toBe(0);
      expect(clampAvailability(-100, 10)).toBe(0);
    });

    it('clamps above totalSlots to totalSlots', () => {
      expect(clampAvailability(11, 10)).toBe(10);
      expect(clampAvailability(100, 10)).toBe(10);
    });

    it('handles zero totalSlots', () => {
      expect(clampAvailability(0, 0)).toBe(0);
      expect(clampAvailability(1, 0)).toBe(0);
    });

    it('handles boundary values', () => {
      expect(clampAvailability(0, 10)).toBe(0);
      expect(clampAvailability(10, 10)).toBe(10);
    });
  });
});
