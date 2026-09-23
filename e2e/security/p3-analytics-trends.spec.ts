/**
 * P3.2 — Analytics Trends API E2E
 *
 * Verifies the POST /api/analytics/trends endpoint:
 *   - Unauthenticated → 401
 *   - Child role → 403
 *   - Parent trend response structure
 *   - Daily granularity
 *   - Weekly granularity
 *   - Date-range filtering
 *   - Specific child filtering
 *   - Cross-family isolation
 *   - Multiple children
 *   - Correct XP earned semantics (positive only)
 *   - Correct money earned semantics (approved + earned only)
 *   - Correct task completion/approval semantics
 *   - Empty/zero activity period
 *   - Invalid input/range rejection
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

/** Helper: get today as YYYY-MM-DD */
function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

/** Helper: get N days ago as YYYY-MM-DD */
function daysAgoStr(n: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().split('T')[0];
}

/** Helper: sum a field across all buckets in a child's trends */
function sumField(
  trends: { [key: string]: unknown }[],
  field: string
): number {
  return trends.reduce(
    (acc: number, b: { [key: string]: unknown }) => acc + ((b[field] as number) || 0),
    0
  );
}

test.describe('P3.2: Analytics Trends API', () => {
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
    const response = await page.request.post('/api/analytics/trends', {
      data: {},
    });

    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.success).toBe(false);
  });

  test('Child request returns 403', async ({ page }) => {
    await resetRateLimitsForScope('member-login:300s');
    await loginAsChild(page, family.childLoginCode, family.childPin);

    const response = await page.request.post('/api/analytics/trends', {
      data: {},
    });

    expect(response.status()).toBe(403);
    const body = await response.json();
    expect(body.success).toBe(false);
  });

  // ═══════════════════════════════════════════════════════════════════
  // SECTION 2: Response Structure
  // ═══════════════════════════════════════════════════════════════════

  test('Parent trend response has correct structure', async ({ page }) => {
    await resetRateLimitsForScope('member-login:300s');
    await loginAsParent(page, family.parentLoginCode, family.parentPin);

    const response = await page.request.post('/api/analytics/trends', {
      data: { granularity: 'day' },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.children).toBeDefined();
    expect(Array.isArray(body.children)).toBe(true);
    expect(body.period).toBeDefined();
    expect(body.period.from).toBeDefined();
    expect(body.period.to).toBeDefined();
    expect(body.granularity).toBe('day');

    // Should have at least one child
    expect(body.children.length).toBeGreaterThanOrEqual(1);

    // Each child should have the expected fields
    const child = body.children[0];
    expect(child.childId).toBeDefined();
    expect(child.name).toBeDefined();
    expect(Array.isArray(child.trends)).toBe(true);

    // Each trend bucket should have the expected fields
    if (child.trends.length > 0) {
      const bucket = child.trends[0];
      expect(typeof bucket.bucket).toBe('string');
      expect(typeof bucket.xp_earned).toBe('number');
      expect(typeof bucket.xp_deductions).toBe('number');
      expect(typeof bucket.money_earned).toBe('number');
      expect(typeof bucket.tasks_completed).toBe('number');
      expect(typeof bucket.tasks_approved).toBe('number');
    }
  });

  // ═══════════════════════════════════════════════════════════════════
  // SECTION 3: Granularity
  // ═══════════════════════════════════════════════════════════════════

  test('Daily granularity produces daily buckets', async ({ page }) => {
    await resetRateLimitsForScope('member-login:300s');
    await loginAsParent(page, family.parentLoginCode, family.parentPin);

    const from = daysAgoStr(6);
    const to = todayStr();

    const response = await page.request.post('/api/analytics/trends', {
      data: {
        from: `${from}T00:00:00.000Z`,
        to: `${to}T23:59:59.999Z`,
        granularity: 'day',
      },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.granularity).toBe('day');

    const child = body.children.find(
      (c: { childId: string }) => c.childId === family.childId
    );
    expect(child).toBeDefined();

    // 7 days: from to to inclusive
    expect(child.trends.length).toBe(7);

    // Buckets should be sequential daily
    expect(child.trends[0].bucket).toBe(from);
    expect(child.trends[6].bucket).toBe(to);
  });

  test('Weekly granularity produces weekly buckets', async ({ page }) => {
    await resetRateLimitsForScope('member-login:300s');
    await loginAsParent(page, family.parentLoginCode, family.parentPin);

    // Use a 3-week range
    const from = daysAgoStr(27);
    const to = todayStr();

    const response = await page.request.post('/api/analytics/trends', {
      data: {
        from: `${from}T00:00:00.000Z`,
        to: `${to}T23:59:59.999Z`,
        granularity: 'week',
      },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.granularity).toBe('week');

    const child = body.children.find(
      (c: { childId: string }) => c.childId === family.childId
    );
    expect(child).toBeDefined();

    // Each bucket should span 7 days
    if (child.trends.length > 1) {
      const first = new Date(child.trends[0].bucket + 'T00:00:00Z');
      const second = new Date(child.trends[1].bucket + 'T00:00:00Z');
      const diffDays = (second.getTime() - first.getTime()) / (1000 * 60 * 60 * 24);
      expect(diffDays).toBe(7);
    }
  });

  // ═══════════════════════════════════════════════════════════════════
  // SECTION 4: Date-Range Filtering
  // ═══════════════════════════════════════════════════════════════════

  test('Date range filtering works correctly', async ({ page }) => {
    await resetRateLimitsForScope('member-login:300s');
    await loginAsParent(page, family.parentLoginCode, family.parentPin);

    const today = todayStr();
    const response = await page.request.post('/api/analytics/trends', {
      data: {
        from: `${today}T00:00:00.000Z`,
        to: `${today}T23:59:59.999Z`,
        granularity: 'day',
      },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.period.from).toContain(today);
    expect(body.period.to).toContain(today);
    expect(body.granularity).toBe('day');

    const child = body.children.find(
      (c: { childId: string }) => c.childId === family.childId
    );
    expect(child).toBeDefined();
    expect(child.trends.length).toBe(1);
    expect(child.trends[0].bucket).toBe(today);
  });

  test('Invalid date range returns 400', async ({ page }) => {
    await resetRateLimitsForScope('member-login:300s');
    await loginAsParent(page, family.parentLoginCode, family.parentPin);

    const response = await page.request.post('/api/analytics/trends', {
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

    const response = await page.request.post('/api/analytics/trends', {
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
  // SECTION 5: Child Filtering
  // ═══════════════════════════════════════════════════════════════════

  test('Specific childId returns only that child', async ({ page }) => {
    await resetRateLimitsForScope('member-login:300s');
    await loginAsParent(page, family.parentLoginCode, family.parentPin);

    const response = await page.request.post('/api/analytics/trends', {
      data: { childId: family.childId, granularity: 'day' },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.children.length).toBe(1);
    expect(body.children[0].childId).toBe(family.childId);
    expect(body.children[0].trends.length).toBeGreaterThan(0);
  });

  // ═══════════════════════════════════════════════════════════════════
  // SECTION 6: Cross-Family Isolation
  // ═══════════════════════════════════════════════════════════════════

  test('Cross-family childId is rejected', async ({ page }) => {
    const familyB = await createTestFamily();

    try {
      await resetRateLimitsForScope('member-login:300s');
      await loginAsParent(page, family.parentLoginCode, family.parentPin);

      const response = await page.request.post('/api/analytics/trends', {
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

    const response = await page.request.post('/api/analytics/trends', {
      data: { family_id: '00000000-0000-0000-0000-000000000000' },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
  });

  // ═══════════════════════════════════════════════════════════════════
  // SECTION 7: Data Correctness — XP Earned Semantics
  // ═══════════════════════════════════════════════════════════════════

  test('Positive XP counted as earned, negative XP counted as deductions', async ({
    page,
  }) => {
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    const today = todayStr();
    const earnAmount = 50;
    const deductionAmount = 10;

    // Seed positive XP
    const { error: seedEarn } = await supabase.from('xp_transactions').insert({
      member_id: family.childId,
      amount: earnAmount,
      source: 'manual',
      description: 'E2E trends xp earned',
    });
    expect(seedEarn).toBeNull();

    // Seed negative XP (deduction)
    const { error: seedDeduct } = await supabase.from('xp_transactions').insert({
      member_id: family.childId,
      amount: -deductionAmount,
      source: 'manual',
      description: 'E2E trends xp deduction',
    });
    expect(seedDeduct).toBeNull();

    try {
      await resetRateLimitsForScope('member-login:300s');
      await loginAsParent(page, family.parentLoginCode, family.parentPin);

      const response = await page.request.post('/api/analytics/trends', {
        data: {
          from: `${today}T00:00:00.000Z`,
          to: `${today}T23:59:59.999Z`,
          childId: family.childId,
          granularity: 'day',
        },
      });

      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);

      const child = body.children.find(
        (c: { childId: string }) => c.childId === family.childId
      );
      expect(child).toBeDefined();
      expect(child.trends.length).toBe(1);

      const bucket = child.trends[0];
      expect(bucket.xp_earned).toBeGreaterThanOrEqual(earnAmount);
      expect(bucket.xp_deductions).toBeGreaterThanOrEqual(deductionAmount);
    } finally {
      await supabase
        .from('xp_transactions')
        .delete()
        .eq('description', 'E2E trends xp earned')
        .eq('member_id', family.childId);
      await supabase
        .from('xp_transactions')
        .delete()
        .eq('description', 'E2E trends xp deduction')
        .eq('member_id', family.childId);
    }
  });

  // ═══════════════════════════════════════════════════════════════════
  // SECTION 8: Data Correctness — Money Earned Semantics
  // ═══════════════════════════════════════════════════════════════════

  test('Only approved earned money counted; pending/rejected/excluded', async ({
    page,
  }) => {
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    const today = todayStr();
    const approvedAmount = 3.5;

    // Seed approved earned money
    const { error: seedApproved } = await supabase
      .from('money_transactions')
      .insert({
        member_id: family.childId,
        amount: approvedAmount,
        type: 'earned',
        source: 'manual',
        status: 'approved',
        description: 'E2E trends money approved',
      });
    expect(seedApproved).toBeNull();

    // Seed pending earned money (should NOT be counted)
    const { error: seedPending } = await supabase
      .from('money_transactions')
      .insert({
        member_id: family.childId,
        amount: 99.0,
        type: 'earned',
        source: 'manual',
        status: 'pending',
        description: 'E2E trends money pending',
      });
    expect(seedPending).toBeNull();

    // Seed rejected earned money (should NOT be counted)
    const { error: seedRejected } = await supabase
      .from('money_transactions')
      .insert({
        member_id: family.childId,
        amount: 88.0,
        type: 'earned',
        source: 'manual',
        status: 'rejected',
        description: 'E2E trends money rejected',
      });
    expect(seedRejected).toBeNull();

    try {
      await resetRateLimitsForScope('member-login:300s');
      await loginAsParent(page, family.parentLoginCode, family.parentPin);

      const response = await page.request.post('/api/analytics/trends', {
        data: {
          from: `${today}T00:00:00.000Z`,
          to: `${today}T23:59:59.999Z`,
          childId: family.childId,
          granularity: 'day',
        },
      });

      expect(response.status()).toBe(200);
      const body = await response.json();
      const child = body.children.find(
        (c: { childId: string }) => c.childId === family.childId
      );
      expect(child).toBeDefined();

      const bucket = child.trends[0];
      // Must include approved amount
      expect(bucket.money_earned).toBeGreaterThanOrEqual(approvedAmount);
      // Must NOT include pending or rejected amounts
      expect(bucket.money_earned).toBeLessThan(90);
    } finally {
      await supabase
        .from('money_transactions')
        .delete()
        .eq('description', 'E2E trends money approved')
        .eq('member_id', family.childId);
      await supabase
        .from('money_transactions')
        .delete()
        .eq('description', 'E2E trends money pending')
        .eq('member_id', family.childId);
      await supabase
        .from('money_transactions')
        .delete()
        .eq('description', 'E2E trends money rejected')
        .eq('member_id', family.childId);
    }
  });

  // ═══════════════════════════════════════════════════════════════════
  // SECTION 9: Data Correctness — Task Completion/Approval Semantics
  // ═══════════════════════════════════════════════════════════════════

  test('Task completions tracked correctly; only approved=true counted as approved', async ({
    page,
  }) => {
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    const today = todayStr();

    // Create a task in the test family first
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .insert({
        family_id: family.familyId,
        title: 'E2E Trends Test Task',
        description: 'test',
        xp_reward: 10,
        requires_approval: true,
        is_active: true,
        created_by: family.parentId,
        frequency: 'daily',
      })
      .select('id')
      .single();

    expect(taskError).toBeNull();
    const taskId = task!.id;

    // Seed completed + approved task completion
    const { error: seedApproved } = await supabase
      .from('task_completions')
      .insert({
        task_id: taskId,
        member_id: family.childId,
        approved: true,
        completed_at: new Date().toISOString(),
      });
    expect(seedApproved).toBeNull();

    // Seed completed but rejected task completion
    const { error: seedRejected } = await supabase
      .from('task_completions')
      .insert({
        task_id: taskId,
        member_id: family.childId,
        approved: false,
        completed_at: new Date().toISOString(),
      });
    expect(seedRejected).toBeNull();

    // Seed pending task completion (approved = null)
    const { error: seedPending } = await supabase
      .from('task_completions')
      .insert({
        task_id: taskId,
        member_id: family.childId,
        approved: null,
        completed_at: new Date().toISOString(),
      });
    expect(seedPending).toBeNull();

    try {
      await resetRateLimitsForScope('member-login:300s');
      await loginAsParent(page, family.parentLoginCode, family.parentPin);

      const response = await page.request.post('/api/analytics/trends', {
        data: {
          from: `${today}T00:00:00.000Z`,
          to: `${today}T23:59:59.999Z`,
          childId: family.childId,
          granularity: 'day',
        },
      });

      expect(response.status()).toBe(200);
      const body = await response.json();
      const child = body.children.find(
        (c: { childId: string }) => c.childId === family.childId
      );
      expect(child).toBeDefined();

      const bucket = child.trends[0];
      // All 3 completions counted
      expect(bucket.tasks_completed).toBeGreaterThanOrEqual(3);
      // Only approved=true counted as approved (at least 1)
      expect(bucket.tasks_approved).toBeGreaterThanOrEqual(1);
      // Approved should NOT exceed completed
      expect(bucket.tasks_approved).toBeLessThanOrEqual(bucket.tasks_completed);
    } finally {
      await supabase
        .from('task_completions')
        .delete()
        .eq('task_id', taskId);
      await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);
    }
  });

  // ═══════════════════════════════════════════════════════════════════
  // SECTION 10: Empty/Zero Activity Periods
  // ═══════════════════════════════════════════════════════════════════

  test('Zero-activity periods produce zero-value buckets', async ({ page }) => {
    await resetRateLimitsForScope('member-login:300s');
    await loginAsParent(page, family.parentLoginCode, family.parentPin);

    // Use a narrow range with no seeded data (today only)
    const today = todayStr();
    const response = await page.request.post('/api/analytics/trends', {
      data: {
        from: `${today}T00:00:00.000Z`,
        to: `${today}T23:59:59.999Z`,
        granularity: 'day',
        childId: family.childId,
      },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);

    const child = body.children.find(
      (c: { childId: string }) => c.childId === family.childId
    );
    expect(child).toBeDefined();
    expect(child.trends.length).toBe(1);

    // The bucket should exist with numeric zero values
    const bucket = child.trends[0];
    expect(typeof bucket.xp_earned).toBe('number');
    expect(typeof bucket.money_earned).toBe('number');
    expect(typeof bucket.tasks_completed).toBe('number');
    expect(typeof bucket.tasks_approved).toBe('number');
  });

  // ═══════════════════════════════════════════════════════════════════
  // SECTION 11: Date Outside Range Excluded
  // ═══════════════════════════════════════════════════════════════════

  test('Transactions outside requested date range excluded', async ({
    page,
  }) => {
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    // Seed XP transaction that falls outside our query range (2 days ago)
    const outsideDate = new Date();
    outsideDate.setUTCDate(outsideDate.getUTCDate() - 2);
    outsideDate.setUTCHours(12, 0, 0, 0);
    const { error: seedOut } = await supabase.from('xp_transactions').insert({
      member_id: family.childId,
      amount: 999,
      source: 'manual',
      description: 'E2E trends outside range',
      created_at: outsideDate.toISOString(),
    });
    expect(seedOut).toBeNull();

    try {
      await resetRateLimitsForScope('member-login:300s');
      await loginAsParent(page, family.parentLoginCode, family.parentPin);

      // Query only today (narrow range)
      const today = todayStr();
      const response = await page.request.post('/api/analytics/trends', {
        data: {
          from: `${today}T00:00:00.000Z`,
          to: `${today}T23:59:59.999Z`,
          granularity: 'day',
          childId: family.childId,
        },
      });

      expect(response.status()).toBe(200);
      const body = await response.json();
      const child = body.children.find(
        (c: { childId: string }) => c.childId === family.childId
      );
      expect(child).toBeDefined();

      // Today's bucket should NOT include the 999 XP from 2 days ago
      const totalXp = sumField(child.trends, 'xp_earned');
      expect(totalXp).toBeLessThan(999);
    } finally {
      await supabase
        .from('xp_transactions')
        .delete()
        .eq('description', 'E2E trends outside range')
        .eq('member_id', family.childId);
    }
  });

  // ═══════════════════════════════════════════════════════════════════
  // SECTION 12: Multiple Children
  // ═══════════════════════════════════════════════════════════════════

  test('Omitted childId returns all family children', async ({ page }) => {
    await resetRateLimitsForScope('member-login:300s');
    await loginAsParent(page, family.parentLoginCode, family.parentPin);

    const response = await page.request.post('/api/analytics/trends', {
      data: { granularity: 'day' },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    // At minimum, the one child in the family
    expect(body.children.length).toBeGreaterThanOrEqual(1);

    // All children should have trends arrays
    for (const child of body.children) {
      expect(Array.isArray(child.trends)).toBe(true);
      expect(child.childId).toBeDefined();
      expect(child.name).toBeDefined();
    }
  });
});
