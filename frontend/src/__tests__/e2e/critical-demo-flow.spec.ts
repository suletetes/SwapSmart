/**
 * E2E Test: Critical Demo Flow (Reserve → Swap → Receipt)
 * Playwright test automating the primary hackathon demo path.
 *
 * Task 13.20 — Validates: Requirements 10.1–10.8, 11.1–11.8, 12.1–12.11
 *
 * Run against deployed staging environment:
 *   npx playwright test src/__tests__/e2e/critical-demo-flow.spec.ts
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.STAGING_URL || 'http://localhost:3000';

test.describe('Critical Demo Flow: Reserve → Navigate → Swap → Receipt', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto(BASE_URL);
  });

  test('Driver: complete reservation and swap flow', async ({ page }) => {
    // Step 1: Login as demo driver
    await page.goto(`${BASE_URL}/login`);
    await page.fill('[data-testid="phone-input"]', '+2348131234567');
    await page.click('[data-testid="request-otp-btn"]');

    // Wait for OTP screen
    await expect(page.locator('[data-testid="otp-input"]')).toBeVisible({ timeout: 10000 });

    // Enter demo OTP (in staging, use fixed OTP)
    const otpInputs = page.locator('[data-testid="otp-digit"]');
    const demoOtp = '123456';
    for (let i = 0; i < 6; i++) {
      await otpInputs.nth(i).fill(demoOtp[i]);
    }
    await page.click('[data-testid="verify-otp-btn"]');

    // Wait for home screen
    await expect(page.locator('[data-testid="driver-home"]')).toBeVisible({ timeout: 15000 });

    // Step 2: Select a station and reserve
    await page.click('[data-testid="station-card"]');
    await expect(page.locator('[data-testid="station-detail"]')).toBeVisible();

    // Click Reserve Battery
    await page.click('[data-testid="reserve-battery-btn"]');

    // Wait for reservation confirmation
    await expect(page.locator('[data-testid="reservation-active"]')).toBeVisible({ timeout: 10000 });

    // Verify countdown timer is displayed
    await expect(page.locator('[data-testid="countdown-timer"]')).toBeVisible();

    // Step 3: Simulate arrival (click "I've Arrived")
    // In staging, geolocation is mocked to be within 100m of station
    await page.click('[data-testid="arrived-btn"]');

    // Wait for swap code display
    await expect(page.locator('[data-testid="swap-code"]')).toBeVisible({ timeout: 10000 });
    const swapCode = await page.locator('[data-testid="swap-code"]').textContent();
    expect(swapCode).toMatch(/^\d{4}$/);
  });

  test('Operator: confirm arrival and complete swap', async ({ page }) => {
    // Login as operator
    await page.goto(`${BASE_URL}/operator`);

    // Wait for operator dashboard
    await expect(page.locator('[data-testid="operator-dashboard"]')).toBeVisible({ timeout: 15000 });

    // Navigate to reservation queue
    await page.click('[data-testid="reservations-tab"]');

    // Find the active reservation
    const activeReservation = page.locator('[data-testid="reservation-card-arrived"]').first();
    await expect(activeReservation).toBeVisible({ timeout: 10000 });

    // Start swap
    await activeReservation.locator('[data-testid="start-swap-btn"]').click();
    await expect(page.locator('[data-testid="swap-in-progress"]')).toBeVisible();

    // Complete swap
    await page.click('[data-testid="complete-swap-btn"]');
    await expect(page.locator('[data-testid="swap-completed"]')).toBeVisible({ timeout: 10000 });
  });

  test('Driver: verify receipt after swap completion', async ({ page }) => {
    // Navigate to swap history / receipt
    await page.goto(`${BASE_URL}/history`);

    // Find the most recent swap
    const latestSwap = page.locator('[data-testid="swap-history-item"]').first();
    await expect(latestSwap).toBeVisible({ timeout: 10000 });
    await latestSwap.click();

    // Verify receipt contains required fields
    const receipt = page.locator('[data-testid="swap-receipt"]');
    await expect(receipt).toBeVisible();

    // Assert receipt contains unique receipt ID
    const receiptId = await receipt.locator('[data-testid="receipt-id"]').textContent();
    expect(receiptId).toBeTruthy();
    expect(receiptId!.length).toBeGreaterThan(0);

    // Assert receipt contains health score
    const healthScore = await receipt.locator('[data-testid="health-score"]').textContent();
    expect(healthScore).toBeTruthy();
    const score = parseInt(healthScore!.replace(/[^0-9]/g, ''));
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);

    // Assert receipt contains estimated range
    const estimatedRange = await receipt.locator('[data-testid="estimated-range"]').textContent();
    expect(estimatedRange).toBeTruthy();
    expect(estimatedRange).toContain('km');

    // Assert receipt contains cumulative savings
    const savings = await receipt.locator('[data-testid="cumulative-savings"]').textContent();
    expect(savings).toBeTruthy();
    expect(savings).toContain('₦');
  });
});
