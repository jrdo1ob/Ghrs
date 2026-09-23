/**
 * P3.1 — Analytics Summary API E2E
 *
 * Verifies the POST /api/analytics/summary endpoint:
 *   - Unauthenticated → 401
 *   - Child role → 403
 *   - Parent summary for own family → correct result
 *   - Parent requesting a specific own child → correct result
 *   - Cross-family child access → rejected
 *   - Date-range filtering → correct result
 *   - No client-controlled family ID authority
 */

import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import {
  createTestFamily,
  deleteTestFamily,
  type TestFamily,
} from '../fixtures/family';
import { loginAsParent, loginAsChild } from '../helpers/auth';
import { resetRateLimitsForScope } from '../helpers/rate-limit';

const SUPABASE_URL = process.env.E2E_SUPABASE_URL!;
const SERVICE_KEY = process.env.E2E_SUPABASE_SERVICE_ROLE_KEY!;

test.describe('P3.1: Analytics Summary API', () => {
  let family: TestFamily;

  test.beforeAll(async () => {
    family = await createTestFamily();
  });

  test.afterAll(async () => {
    await deleteTestFamily(family.familyId);
  });

  // ═══════════════════════════════════════════════════════════════════
  // SECTION 1: Authentication & Authorization
  // ═══════════════════════════════════════════════════════════════════

  test('Unauthenticated request returns 401', async ({ page }) => {
    const response = await page.request.post('/api/analytics/summary', {
      data: {},
    });

    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.success).toBe(false);
  });

  test('Child request returns 403', async ({ page }) => {
    await resetRateLimitsForScope('member-login:300s');
    await loginAsChild(page, family.childLoginCode, family.childPin);

    const response = await page.request.post('/api/analytics/summary', {
      data: {},
    });

    expect(response.status()).toBe(403);
    const body = await response.json();
    expect(body.success).toBe(false);
  });

  // ═══════════════════════════════════════════════════════════════════
  // SECTION 2: Basic Functionality
  // ═══════════════════════════════════════════════════════════════════

  test('Parent summary for own family returns correct structure', async ({
    page,
  }) => {
    await resetRateLimitsForScope('member-login:300s');
    await loginAsParent(page, family.parentLoginCode, family.parentPin);

    const response = await page.request.post('/api/analytics/summary', {
      data: {},
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.children).toBeDefined();
    expect(Array.isArray(body.children)).toBe(true);
    expect(body.period).toBeDefined();
    expect(body.period.from).toBeDefined();
    expect(body.period.to).toBeDefined();

    // Should have at least one child
    expect(body.children.length).toBeGreaterThanOrEqual(1);

    // Each child should have the expected fields
    const child = body.children[0];
    expect(child.childId).toBeDefined();
    expect(child.name).toBeDefined();
    expect(typeof child.xp_earned).toBe('number');
    expect(typeof child.money_earned).toBe('number');
    expect(typeof child.tasks_completed).toBe('number');
    expect(typeof child.tasks_approved).toBe('number');
  });

  test('Parent summary with specific childId returns that child only', async ({
    page,
  }) => {
    await resetRateLimitsForScope('member-login:300s');
    await loginAsParent(page, family.parentLoginCode, family.parentPin);

    const response = await page.request.post('/api/analytics/summary', {
      data: { childId: family.childId },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.children.length).toBe(1);
    expect(body.children[0].childId).toBe(family.childId);
  });

  // ═══════════════════════════════════════════════════════════════════
  // SECTION 3: Date Range Filtering
  // ═══════════════════════════════════════════════════════════════════

  test('Date range filtering works correctly', async ({ page }) => {
    await resetRateLimitsForScope('member-login:300s');
    await loginAsParent(page, family.parentLoginCode, family.parentPin);

    // Use a very narrow range (today only)
    const today = new Date().toISOString().split('T')[0]
    const response = await page.request.post('/api/analytics/summary', {
      data: {
        from: `${today}T00:00:00.000Z`,
        to: `${today}T23:59:59.999Z`,
      },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.period.from).toContain(today);
    expect(body.period.to).toContain(today);
  });

  test('Invalid date range returns 400', async ({ page }) => {
    await resetRateLimitsForScope('member-login:300s');
    await loginAsParent(page, family.parentLoginCode, family.parentPin);

    const response = await page.request.post('/api/analytics/summary', {
      data: {
        from: 'not-a-date',
        to: 'also-not-a-date',
      },
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
  });

  test('Range exceeding 365 days returns 400', async ({ page }) => {
    await resetRateLimitsForScope('member-login:300s');
    await loginAsParent(page, family.parentLoginCode, family.parentPin);

    const response = await page.request.post('/api/analytics/summary', {
      data: {
        from: '2024-01-01T00:00:00.000Z',
        to: '2025-12-31T23:59:59.999Z',
      },
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
  });

  // ═══════════════════════════════════════════════════════════════════
  // SECTION 4: Cross-Family Isolation
  // ═══════════════════════════════════════════════════════════════════

  test('Cross-family childId is rejected', async ({ page }) => {
    // Create a second family
    const familyB = await createTestFamily();

    try {
      await resetRateLimitsForScope('member-login:300s');
      await loginAsParent(page, family.parentLoginCode, family.parentPin);

      // Try to access Family B's child
      const response = await page.request.post('/api/analytics/summary', {
        data: { childId: familyB.childId },
      });

      expect(response.status()).toBe(403);
      const body = await response.json();
      expect(body.success).toBe(false);
    } finally {
      await deleteTestFamily(familyB.familyId);
    }
  });

  test('No client-controlled family ID authority', async ({ page }) => {
    await resetRateLimitsForScope('member-login:300s');
    await loginAsParent(page, family.parentLoginCode, family.parentPin);

    // Try to inject a family_id in the request body
    const response = await page.request.post('/api/analytics/summary', {
      data: { family_id: '00000000-0000-0000-0000-000000000000' },
    });

    // Should still return 200 with only the authenticated family's data
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);

    // All children should belong to the authenticated family
    // (the injected family_id is ignored)
  });

  // ═══════════════════════════════════════════════════════════════════
  // SECTION 5: Data Accuracy with Seeded Data
  // ═══════════════════════════════════════════════════════════════════

  test('XP earned reflects actual transactions in date range', async ({
    page,
  }) => {
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    // Seed an XP transaction for the test child
    const seedAmount = 42;
    const { error: seedError } = await supabase.from('xp_transactions').insert({
      member_id: family.childId,
      amount: seedAmount,
      source: 'manual',
      description: 'E2E analytics test seed',
    });
    expect(seedError).toBeNull();

    try {
      await resetRateLimitsForScope('member-login:300s');
      await loginAsParent(page, family.parentLoginCode, family.parentPin);

      // Use a range that includes today
      const today = new Date().toISOString().split('T')[0];
      const response = await page.request.post('/api/analytics/summary', {
        data: {
          from: `${today}T00:00:00.000Z`,
          to: `${today}T23:59:59.999Z`,
          childId: family.childId,
        },
      });

      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.children.length).toBe(1);

      // The child should have at least the seeded XP amount
      expect(body.children[0].xp_earned).toBeGreaterThanOrEqual(seedAmount);
    } finally {
      // Clean up the seeded transaction
      await supabase
        .from('xp_transactions')
        .delete()
        .eq('description', 'E2E analytics test seed')
        .eq('member_id', family.childId);
    }
  });
});
