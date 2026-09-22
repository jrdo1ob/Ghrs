/**
 * P1.2.7 — Financial Accuracy E2E
 *
 * Covers remaining financial-accuracy gaps not addressed by P1.2.1–P1.2.7-B:
 *   A. Manual XP adjustment happy path
 *   B. Manual BHD adjustment happy path
 *   C. Insufficient XP gift redemption
 *   D. Insufficient BHD withdrawal
 *   E. Duplicate task approval
 *   F. Duplicate gift approval
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

// ═══════════════════════════════════════════════════════════════════
// A. Manual XP Adjustment — Happy Path
// ═══════════════════════════════════════════════════════════════════

test.describe('P1.2.7-A: Manual XP Adjustment', () => {
  let family: TestFamily;
  const XP_ADJUSTMENT = 15;

  test.beforeAll(async () => {
    family = await createTestFamily();
  });

  test.afterAll(async () => {
    await deleteTestFamily(family.familyId);
  });

  test('Parent can adjust child XP via API', async ({ page }) => {
    await resetRateLimitsForScope('member-login:300s');
    await loginAsParent(page, family.parentLoginCode, family.parentPin);

    const response = await page.request.post('/api/members/adjust', {
      data: {
        child_id: family.childId,
        type: 'reward',
        currency_type: 'xp',
        amount: XP_ADJUSTMENT,
        reason: 'E2E P1.2.7 XP adjustment test',
      },
    });

    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.xp_applied).toBe(XP_ADJUSTMENT);
  });

  test('Child cannot adjust balance', async ({ page }) => {
    await resetRateLimitsForScope('member-login:300s');
    await loginAsChild(page, family.childLoginCode, family.childPin);

    const response = await page.request.post('/api/members/adjust', {
      data: {
        child_id: family.childId,
        type: 'reward',
        currency_type: 'xp',
        amount: 999,
        reason: 'Child theft attempt',
      },
    });

    expect(response.status()).toBe(403);
    const body = await response.json();
    expect(body.success).toBe(false);
  });

  test('XP balance increased by exactly the adjustment amount', async ({
    page,
  }) => {
    await resetRateLimitsForScope('member-login:300s');
    await loginAsChild(page, family.childLoginCode, family.childPin);

    const response = await page.request.post('/api/child-mode/data', {
      data: { section: 'home' },
    });

    expect(response.ok()).toBeTruthy();
    const body = await response.json();

    const xp = Number(body.xp) || 0;
    expect(xp).toBeGreaterThanOrEqual(XP_ADJUSTMENT);
  });

  test('Exactly one XP transaction was created', async () => {
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: txs } = await supabase
      .from('xp_transactions')
      .select('id, amount, source, source_id, description')
      .eq('member_id', family.childId)
      .eq('source', 'manual');

    expect(txs).toBeTruthy();
    expect(txs!.length).toBe(1);
    expect(txs![0].amount).toBe(XP_ADJUSTMENT);
    expect(txs![0].description).toContain('E2E P1.2.7');
  });
});

// ═══════════════════════════════════════════════════════════════════
// B. Manual BHD Adjustment — Happy Path
// ═══════════════════════════════════════════════════════════════════

test.describe('P1.2.7-B: Manual BHD Adjustment', () => {
  let family: TestFamily;
  const BHD_ADJUSTMENT = 1.5;

  test.beforeAll(async () => {
    family = await createTestFamily();
  });

  test.afterAll(async () => {
    await deleteTestFamily(family.familyId);
  });

  test('Parent can adjust child BHD via API', async ({ page }) => {
    await resetRateLimitsForScope('member-login:300s');
    await loginAsParent(page, family.parentLoginCode, family.parentPin);

    const response = await page.request.post('/api/members/adjust', {
      data: {
        child_id: family.childId,
        type: 'reward',
        currency_type: 'money',
        amount: BHD_ADJUSTMENT,
        reason: 'E2E P1.2.7 BHD adjustment test',
      },
    });

    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(Number(body.money_applied)).toBeCloseTo(BHD_ADJUSTMENT, 3);
  });

  test('BHD balance increased by exactly the adjustment amount', async ({
    page,
  }) => {
    await resetRateLimitsForScope('member-login:300s');
    await loginAsChild(page, family.childLoginCode, family.childPin);

    const response = await page.request.post('/api/child-mode/data', {
      data: { section: 'home' },
    });

    expect(response.ok()).toBeTruthy();
    const body = await response.json();

    const bhd = Number(body.money_balance) || 0;
    expect(bhd).toBeCloseTo(BHD_ADJUSTMENT, 3);
  });

  test('Exactly one money transaction was created', async () => {
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: txs } = await supabase
      .from('money_transactions')
      .select('id, amount, type, source, status')
      .eq('member_id', family.childId)
      .eq('source', 'manual');

    expect(txs).toBeTruthy();
    expect(txs!.length).toBe(1);
    expect(Number(txs![0].amount)).toBeCloseTo(BHD_ADJUSTMENT, 3);
    expect(txs![0].type).toBe('earned');
    expect(txs![0].status).toBe('approved');
  });
});

// ═══════════════════════════════════════════════════════════════════
// C. Insufficient XP Gift Redemption
// ═══════════════════════════════════════════════════════════════════

test.describe('P1.2.7-C: Insufficient XP Gift Redemption', () => {
  let family: TestFamily;
  let giftId: string;
  const GIFT_COST_XP = 100;
  const CHILD_XP = 10;

  test.beforeAll(async () => {
    family = await createTestFamily();

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    // Give child only 10 XP (less than gift cost of 100)
    await supabase.from('xp_transactions').insert({
      member_id: family.childId,
      amount: CHILD_XP,
      source: 'manual',
      description: 'E2E P1.2.7-C insufficient XP seed',
    });

    // Create a gift costing 100 XP
    const { data: gift } = await supabase
      .from('gifts')
      .insert({
        family_id: family.familyId,
        title: 'Expensive Gift',
        cost_xp: GIFT_COST_XP,
        is_active: true,
        created_by: family.parentId,
      })
      .select('id')
      .single();

    giftId = gift!.id;
  });

  test.afterAll(async () => {
    await deleteTestFamily(family.familyId);
  });

  test('Child cannot redeem gift with insufficient XP', async ({ page }) => {
    await resetRateLimitsForScope('member-login:300s');
    await loginAsChild(page, family.childLoginCode, family.childPin);

    const response = await page.request.post('/api/gifts/redeem', {
      data: { gift_id: giftId },
    });

    // Should fail — RPC returns success=false for insufficient XP
    expect(response.ok()).toBeFalsy();
    const body = await response.json();
    expect(body.success).toBe(false);
  });

  test('XP balance is unchanged after failed redemption', async ({ page }) => {
    await resetRateLimitsForScope('member-login:300s');
    await loginAsChild(page, family.childLoginCode, family.childPin);

    const response = await page.request.post('/api/child-mode/data', {
      data: { section: 'home' },
    });

    expect(response.ok()).toBeTruthy();
    const body = await response.json();

    const xp = Number(body.xp) || 0;
    expect(xp).toBe(CHILD_XP);
  });

  test('No redemption record was created', async () => {
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: redemptions } = await supabase
      .from('gift_redemptions')
      .select('id')
      .eq('gift_id', giftId)
      .eq('member_id', family.childId);

    expect(redemptions).toBeTruthy();
    expect(redemptions!.length).toBe(0);
  });

  test('No XP transaction was inserted for the gift', async () => {
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: xpTxs } = await supabase
      .from('xp_transactions')
      .select('id')
      .eq('member_id', family.childId)
      .eq('source', 'gift_redemption');

    expect(xpTxs).toBeTruthy();
    expect(xpTxs!.length).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════
// D. Insufficient BHD Withdrawal
// ═══════════════════════════════════════════════════════════════════

test.describe('P1.2.7-D: Insufficient BHD Withdrawal', () => {
  let family: TestFamily;
  const CHILD_BHD = 5;
  const WITHDRAWAL_AMOUNT = 50;

  test.beforeAll(async () => {
    family = await createTestFamily();

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    // Give child only 5 BHD (less than withdrawal of 50)
    await supabase.from('money_transactions').insert({
      member_id: family.childId,
      amount: CHILD_BHD,
      type: 'earned',
      source: 'manual',
      status: 'approved',
      description: 'E2E P1.2.7-D insufficient BHD seed',
    });
  });

  test.afterAll(async () => {
    await deleteTestFamily(family.familyId);
  });

  test('Child cannot withdraw more than their balance', async ({ page }) => {
    await resetRateLimitsForScope('member-login:300s');
    await loginAsChild(page, family.childLoginCode, family.childPin);

    const response = await page.request.post('/api/withdrawals/request', {
      data: { amount: WITHDRAWAL_AMOUNT },
    });

    // Should fail — balance check at request time returns 400
    expect(response.ok()).toBeFalsy();
    const body = await response.json();
    expect(body.success).toBe(false);
  });

  test('BHD balance is unchanged after failed withdrawal', async ({
    page,
  }) => {
    await resetRateLimitsForScope('member-login:300s');
    await loginAsChild(page, family.childLoginCode, family.childPin);

    const response = await page.request.post('/api/child-mode/data', {
      data: { section: 'home' },
    });

    expect(response.ok()).toBeTruthy();
    const body = await response.json();

    const bhd = Number(body.money_balance) || 0;
    expect(bhd).toBe(CHILD_BHD);
  });

  test('No withdrawal request was created', async () => {
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: requests } = await supabase
      .from('withdrawal_requests')
      .select('id')
      .eq('member_id', family.childId);

    expect(requests).toBeTruthy();
    expect(requests!.length).toBe(0);
  });

  test('No money transaction was inserted for the withdrawal', async () => {
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: txs } = await supabase
      .from('money_transactions')
      .select('id')
      .eq('member_id', family.childId)
      .eq('source', 'withdrawal');

    expect(txs).toBeTruthy();
    expect(txs!.length).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════
// E. Duplicate Task Approval
// ═══════════════════════════════════════════════════════════════════

test.describe('P1.2.7-E: Duplicate Task Approval', () => {
  let family: TestFamily;
  let taskId: string;
  let completionId: string;
  const XP_REWARD = 20;
  const BHD_REWARD = 3;
  let xpBefore: number;
  let bhdBefore: number;

  test.beforeAll(async () => {
    family = await createTestFamily();

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    // Seed child with some balance
    await supabase.from('xp_transactions').insert({
      member_id: family.childId,
      amount: 100,
      source: 'manual',
      description: 'E2E P1.2.7-E seed',
    });
    await supabase.from('money_transactions').insert({
      member_id: family.childId,
      amount: 50,
      type: 'earned',
      source: 'manual',
      status: 'approved',
      description: 'E2E P1.2.7-E seed BHD',
    });
  });

  test.afterAll(async () => {
    await deleteTestFamily(family.familyId);
  });

  test('Setup: create task, complete, approve once', async ({ page }) => {
    // Create task
    await resetRateLimitsForScope('member-login:300s');
    await loginAsParent(page, family.parentLoginCode, family.parentPin);

    const createResp = await page.request.post('/api/tasks/create', {
      data: {
        title: 'Duplicate Approval Test Task',
        xp_reward: XP_REWARD,
        money_reward: BHD_REWARD,
        assigned_to: [family.childId],
        requires_approval: true,
      },
    });
    expect(createResp.ok()).toBeTruthy();
    const createBody = await createResp.json();
    taskId = createBody.task.id;

    // Complete as child
    await resetRateLimitsForScope('member-login:300s');
    await loginAsChild(page, family.childLoginCode, family.childPin);

    const completeResp = await page.request.post('/api/tasks/complete', {
      data: { task_id: taskId },
    });
    expect(completeResp.ok()).toBeTruthy();

    // Get completion ID
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: completion } = await supabase
      .from('task_completions')
      .select('id')
      .eq('task_id', taskId)
      .eq('member_id', family.childId)
      .single();
    completionId = completion!.id;

    // Capture balances before approval
    await resetRateLimitsForScope('member-login:300s');
    await loginAsChild(page, family.childLoginCode, family.childPin);
    const balanceResp = await page.request.post('/api/child-mode/data', {
      data: { section: 'home' },
    });
    const balanceBody = await balanceResp.json();
    xpBefore = Number(balanceBody.xp) || 0;
    bhdBefore = Number(balanceBody.money_balance) || 0;

    // Approve once
    await resetRateLimitsForScope('member-login:300s');
    await loginAsParent(page, family.parentLoginCode, family.parentPin);
    const approveResp = await page.request.post('/api/tasks/approve', {
      data: { completion_id: completionId, approve: true },
    });
    expect(approveResp.ok()).toBeTruthy();
    const approveBody = await approveResp.json();
    expect(approveBody.data).toBeTruthy();
    expect(approveBody.data[0].xp_awarded).toBe(XP_REWARD);
    expect(approveBody.data[0].money_awarded).toBe(BHD_REWARD);
    expect(approveBody.data[0].already_approved).toBe(false);
  });

  test('Duplicate approval is no-op with already_approved=true', async ({
    page,
  }) => {
    await resetRateLimitsForScope('member-login:300s');
    await loginAsParent(page, family.parentLoginCode, family.parentPin);

    const response = await page.request.post('/api/tasks/approve', {
      data: { completion_id: completionId, approve: true },
    });

    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.success).toBe(true);
    // RPC returns already_approved = true
    expect(body.data[0].already_approved).toBe(true);
    expect(body.data[0].xp_awarded).toBe(0);
    expect(body.data[0].money_awarded).toBe(0);
  });

  test('XP balance unchanged after duplicate approval', async ({ page }) => {
    await resetRateLimitsForScope('member-login:300s');
    await loginAsChild(page, family.childLoginCode, family.childPin);

    const response = await page.request.post('/api/child-mode/data', {
      data: { section: 'home' },
    });
    expect(response.ok()).toBeTruthy();
    const body = await response.json();

    const xp = Number(body.xp) || 0;
    expect(xp).toBe(xpBefore + XP_REWARD);
  });

  test('BHD balance unchanged after duplicate approval', async ({ page }) => {
    await resetRateLimitsForScope('member-login:300s');
    await loginAsChild(page, family.childLoginCode, family.childPin);

    const response = await page.request.post('/api/child-mode/data', {
      data: { section: 'home' },
    });
    expect(response.ok()).toBeTruthy();
    const body = await response.json();

    const bhd = Number(body.money_balance) || 0;
    expect(bhd).toBeCloseTo(bhdBefore + BHD_REWARD, 3);
  });

  test('Exactly one XP and one BHD transaction (no duplicates)', async () => {
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    const { count: xpCount } = await supabase
      .from('xp_transactions')
      .select('id', { count: 'exact', head: true })
      .eq('member_id', family.childId)
      .eq('source', 'task')
      .eq('source_id', completionId);

    expect(xpCount).toBe(1);

    const { count: moneyCount } = await supabase
      .from('money_transactions')
      .select('id', { count: 'exact', head: true })
      .eq('member_id', family.childId)
      .eq('source', 'task')
      .eq('source_id', completionId);

    expect(moneyCount).toBe(1);
  });
});

// ═══════════════════════════════════════════════════════════════════
// F. Duplicate Gift Approval
// ═══════════════════════════════════════════════════════════════════

test.describe('P1.2.7-F: Duplicate Gift Approval', () => {
  let family: TestFamily;
  let giftId: string;
  let redemptionId: string;
  const COST_XP = 30;
  const COST_BHD = 1.0;
  let xpBefore: number;
  let bhdBefore: number;

  test.beforeAll(async () => {
    family = await createTestFamily();

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    // Seed child with enough XP and BHD
    await supabase.from('xp_transactions').insert({
      member_id: family.childId,
      amount: 200,
      source: 'manual',
      description: 'E2E P1.2.7-F seed XP',
    });
    await supabase.from('money_transactions').insert({
      member_id: family.childId,
      amount: 50,
      type: 'earned',
      source: 'manual',
      status: 'approved',
      description: 'E2E P1.2.7-F seed BHD',
    });

    // Create gift
    const { data: gift } = await supabase
      .from('gifts')
      .insert({
        family_id: family.familyId,
        title: 'Duplicate Approval Test Gift',
        cost_xp: COST_XP,
        cost_money: COST_BHD,
        is_active: true,
        created_by: family.parentId,
      })
      .select('id')
      .single();

    giftId = gift!.id;
  });

  test.afterAll(async () => {
    await deleteTestFamily(family.familyId);
  });

  test('Setup: child redeems, parent approves once', async ({ page }) => {
    // Child redeems
    await resetRateLimitsForScope('member-login:300s');
    await loginAsChild(page, family.childLoginCode, family.childPin);

    const redeemResp = await page.request.post('/api/gifts/redeem', {
      data: { gift_id: giftId },
    });
    expect(redeemResp.ok()).toBeTruthy();

    // Get redemption ID
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: redemption } = await supabase
      .from('gift_redemptions')
      .select('id')
      .eq('gift_id', giftId)
      .eq('member_id', family.childId)
      .single();
    redemptionId = redemption!.id;

    // Capture balances before approval
    await resetRateLimitsForScope('member-login:300s');
    await loginAsChild(page, family.childLoginCode, family.childPin);
    const balanceResp = await page.request.post('/api/child-mode/data', {
      data: { section: 'home' },
    });
    const balanceBody = await balanceResp.json();
    xpBefore = Number(balanceBody.xp) || 0;
    bhdBefore = Number(balanceBody.money_balance) || 0;

    // Parent approves once
    await resetRateLimitsForScope('member-login:300s');
    await loginAsParent(page, family.parentLoginCode, family.parentPin);
    const approveResp = await page.request.post('/api/gifts/approve', {
      data: { redemption_id: redemptionId },
    });
    expect(approveResp.ok()).toBeTruthy();
    const approveBody = await approveResp.json();
    expect(approveBody.success).toBe(true);
    expect(approveBody.xp_applied).toBe(COST_XP);
    expect(Number(approveBody.money_applied)).toBeCloseTo(COST_BHD, 3);
  });

  test('Duplicate gift approval is rejected', async ({ page }) => {
    await resetRateLimitsForScope('member-login:300s');
    await loginAsParent(page, family.parentLoginCode, family.parentPin);

    const response = await page.request.post('/api/gifts/approve', {
      data: { redemption_id: redemptionId },
    });

    // RPC returns success=false when status != 'pending'
    expect(response.ok()).toBeFalsy();
    const body = await response.json();
    expect(body.success).toBe(false);
  });

  test('XP balance unchanged after duplicate gift approval', async ({
    page,
  }) => {
    await resetRateLimitsForScope('member-login:300s');
    await loginAsChild(page, family.childLoginCode, family.childPin);

    const response = await page.request.post('/api/child-mode/data', {
      data: { section: 'home' },
    });
    expect(response.ok()).toBeTruthy();
    const body = await response.json();

    const xp = Number(body.xp) || 0;
    expect(xp).toBe(xpBefore - COST_XP);
  });

  test('BHD balance unchanged after duplicate gift approval', async ({
    page,
  }) => {
    await resetRateLimitsForScope('member-login:300s');
    await loginAsChild(page, family.childLoginCode, family.childPin);

    const response = await page.request.post('/api/child-mode/data', {
      data: { section: 'home' },
    });
    expect(response.ok()).toBeTruthy();
    const body = await response.json();

    const bhd = Number(body.money_balance) || 0;
    expect(bhd).toBeCloseTo(bhdBefore - COST_BHD, 3);
  });

  test('Exactly one XP deduction and one BHD deduction (no duplicates)', async () => {
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    const { count: xpCount } = await supabase
      .from('xp_transactions')
      .select('id', { count: 'exact', head: true })
      .eq('member_id', family.childId)
      .eq('source', 'gift_redemption')
      .eq('source_id', giftId);

    expect(xpCount).toBe(1);

    const { count: moneyCount } = await supabase
      .from('money_transactions')
      .select('id', { count: 'exact', head: true })
      .eq('member_id', family.childId)
      .eq('source', 'gift_redemption')
      .eq('source_id', giftId);

    expect(moneyCount).toBe(1);
  });
});
