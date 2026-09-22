/**
 * P1.2.7-B: Task Revoke Money Reversal Regression
 *
 * Confirmed defect: migration 0340 replaced revoke_task_approval but dropped
 * the BHD money reversal that existed in migration 027. XP was reversed; BHD was not.
 *
 * This test verifies that revoking an approved money-bearing task correctly
 * reverses BOTH XP and BHD, and that no incorrect reversal occurs for
 * tasks without BHD rewards.
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

test.describe('P1.2.7-B: Task Revoke Money Reversal', () => {
  let family: TestFamily;

  // Deterministic values
  const XP_REWARD = 30;
  const BHD_REWARD = 5;

  // Captured state
  let taskId: string;
  let completionId: string;
  let xpBeforeApproval: number;
  let bhdBeforeApproval: number;

  test.beforeAll(async () => {
    family = await createTestFamily();

    // Seed child with some existing balance so we have a non-zero baseline
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    await supabase.from('xp_transactions').insert({
      member_id: family.childId,
      amount: 100,
      source: 'manual',
      description: 'E2E seed XP for revoke test',
    });
    await supabase.from('money_transactions').insert({
      member_id: family.childId,
      amount: 50,
      type: 'earned',
      source: 'manual',
      status: 'approved',
      description: 'E2E seed BHD for revoke test',
    });
  });

  test.afterAll(async () => {
    await deleteTestFamily(family.familyId);
  });

  // ─── STEP 1: Create task with XP and BHD reward ────────────────

  test('STEP 1: Create task with XP and BHD reward', async ({ page }) => {
    await resetRateLimitsForScope('member-login:300s');
    await loginAsParent(page, family.parentLoginCode, family.parentPin);

    const response = await page.request.post('/api/tasks/create', {
      data: {
        title: 'Revoke Money Test Task',
        xp_reward: XP_REWARD,
        money_reward: BHD_REWARD,
        assigned_to: [family.childId],
        requires_approval: true,
      },
    });

    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.task.id).toBeTruthy();
    expect(body.task.xp_reward).toBe(XP_REWARD);
    expect(body.task.money_reward).toBe(BHD_REWARD);

    taskId = body.task.id;
  });

  // ─── STEP 2: Capture balances before approval ───────────────────

  test('STEP 2: Capture balances before approval', async ({ page }) => {
    await loginAsChild(page, family.childLoginCode, family.childPin);

    const response = await page.request.post('/api/child-mode/data', {
      data: { section: 'home' },
    });

    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.success).toBe(true);

    xpBeforeApproval = Number(body.xp) || 0;
    bhdBeforeApproval = Number(body.money_balance) || 0;

    expect(typeof xpBeforeApproval).toBe('number');
    expect(typeof bhdBeforeApproval).toBe('number');
  });

  // ─── STEP 3: Child completes task ───────────────────────────────

  test('STEP 3: Child completes task', async ({ page }) => {
    await resetRateLimitsForScope('member-login:300s');
    await loginAsChild(page, family.childLoginCode, family.childPin);

    const response = await page.request.post('/api/tasks/complete', {
      data: { task_id: taskId },
    });

    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.success).toBe(true);
  });

  // ─── STEP 3b: Completion is pending ─────────────────────────────

  test('STEP 3b: Completion is in pending state', async () => {
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: completion, error } = await supabase
      .from('task_completions')
      .select('id, task_id, member_id, approved')
      .eq('task_id', taskId)
      .eq('member_id', family.childId)
      .single();

    expect(error).toBeNull();
    expect(completion).toBeTruthy();
    expect(completion!.approved).toBeNull(); // pending

    completionId = completion!.id;
  });

  // ─── STEP 4: Parent approves ────────────────────────────────────

  test('STEP 4: Parent approves completion', async ({ page }) => {
    await loginAsParent(page, family.parentLoginCode, family.parentPin);

    const response = await page.request.post('/api/tasks/approve', {
      data: { completion_id: completionId, approve: true },
    });

    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.success).toBe(true);
  });

  // ─── STEP 5: Verify rewards applied ────────────────────────────

  test('STEP 5: XP and BHD rewards were applied', async ({ page }) => {
    await loginAsChild(page, family.childLoginCode, family.childPin);

    const response = await page.request.post('/api/child-mode/data', {
      data: { section: 'home' },
    });

    expect(response.ok()).toBeTruthy();
    const body = await response.json();

    const xpAfterApproval = Number(body.xp) || 0;
    const bhdAfterApproval = Number(body.money_balance) || 0;

    expect(xpAfterApproval - xpBeforeApproval).toBe(XP_REWARD);
    expect(bhdAfterApproval - bhdBeforeApproval).toBe(BHD_REWARD);
  });

  // ─── STEP 6: Capture ledger state after approval ────────────────

  test('STEP 6: Ledger state after approval', async () => {
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    // XP transaction exists
    const { data: xpTx } = await supabase
      .from('xp_transactions')
      .select('id, amount, source, source_id')
      .eq('member_id', family.childId)
      .eq('source', 'task')
      .eq('source_id', completionId)
      .single();

    expect(xpTx).toBeTruthy();
    expect(xpTx!.amount).toBe(XP_REWARD);

    // BHD transaction exists
    const { data: moneyTx } = await supabase
      .from('money_transactions')
      .select('id, amount, type, source, source_id, status')
      .eq('member_id', family.childId)
      .eq('source', 'task')
      .eq('source_id', completionId)
      .single();

    expect(moneyTx).toBeTruthy();
    expect(moneyTx!.amount).toBe(BHD_REWARD);
    expect(moneyTx!.type).toBe('earned');
    expect(moneyTx!.status).toBe('approved');
  });

  // ─── STEP 7: Parent revokes ────────────────────────────────────

  test('STEP 7: Parent revokes the approved task', async ({ page }) => {
    await loginAsParent(page, family.parentLoginCode, family.parentPin);

    const response = await page.request.post('/api/tasks/revoke', {
      data: { completion_id: completionId, reason: 'Testing revoke money reversal' },
    });

    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.success).toBe(true);
  });

  // ─── STEP 8: Verify XP reversed ────────────────────────────────

  test('STEP 8: XP balance returned to pre-approval value', async ({
    page,
  }) => {
    await loginAsChild(page, family.childLoginCode, family.childPin);

    const response = await page.request.post('/api/child-mode/data', {
      data: { section: 'home' },
    });

    expect(response.ok()).toBeTruthy();
    const body = await response.json();

    const xpAfterRevoke = Number(body.xp) || 0;
    expect(xpAfterRevoke).toBe(xpBeforeApproval);
  });

  // ─── STEP 9: Verify BHD reversed ───────────────────────────────

  test('STEP 9: BHD balance returned to pre-approval value', async ({
    page,
  }) => {
    await loginAsChild(page, family.childLoginCode, family.childPin);

    const response = await page.request.post('/api/child-mode/data', {
      data: { section: 'home' },
    });

    expect(response.ok()).toBeTruthy();
    const body = await response.json();

    const bhdAfterRevoke = Number(body.money_balance) || 0;
    expect(bhdAfterRevoke).toBe(bhdBeforeApproval);
  });

  // ─── STEP 10: Verify ledger after revoke ───────────────────────

  test('STEP 10: Exactly one XP and one BHD reversal exist', async () => {
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    // XP reversal: negative amount, source='task', source_id=completionId
    const { data: xpReversals } = await supabase
      .from('xp_transactions')
      .select('id, amount, source, source_id, description')
      .eq('member_id', family.childId)
      .eq('source', 'task')
      .eq('source_id', completionId)
      .lt('amount', 0);

    expect(xpReversals).toBeTruthy();
    expect(xpReversals!.length).toBe(1);
    expect(xpReversals![0].amount).toBe(-XP_REWARD);
    expect(xpReversals![0].description).toContain('Approval Reversal');

    // BHD reversal: type='withdrawn', source='task', source_id=completionId
    const { data: moneyReversals } = await supabase
      .from('money_transactions')
      .select('id, amount, type, source, source_id, status, description')
      .eq('member_id', family.childId)
      .eq('source', 'task')
      .eq('source_id', completionId)
      .eq('type', 'withdrawn');

    expect(moneyReversals).toBeTruthy();
    expect(moneyReversals!.length).toBe(1);
    expect(moneyReversals![0].amount).toBe(BHD_REWARD);
    expect(moneyReversals![0].status).toBe('approved');
    expect(moneyReversals![0].description).toContain('Approval Reversal');
  });

  // ─── STEP 11: Verify task/completion state ─────────────────────

  test('STEP 11: Task and completion are in revoked state', async () => {
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: task } = await supabase
      .from('tasks')
      .select('status')
      .eq('id', taskId)
      .single();

    expect(task).toBeTruthy();
    expect(task!.status).toBe('pending');

    const { data: completion } = await supabase
      .from('task_completions')
      .select('approved, approved_by, approved_at')
      .eq('id', completionId)
      .single();

    expect(completion).toBeTruthy();
    expect(completion!.approved).toBeNull();
    expect(completion!.approved_by).toBeNull();
    expect(completion!.approved_at).toBeNull();
  });

  // ─── STEP 12: Verify approval history ──────────────────────────

  test('STEP 12: Approval history records both approve and revoke', async () => {
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: history } = await supabase
      .from('task_approval_history')
      .select('action, previous_status, new_status')
      .eq('completion_id', completionId)
      .order('created_at', { ascending: true });

    expect(history).toBeTruthy();
    expect(history!.length).toBeGreaterThanOrEqual(2);

    // First entry: approved
    const approveEntry = history!.find((h) => h.action === 'approved');
    expect(approveEntry).toBeTruthy();
    expect(approveEntry!.previous_status).toBe('completed');
    expect(approveEntry!.new_status).toBe('approved');

    // Second entry: revoked
    const revokeEntry = history!.find((h) => h.action === 'revoked');
    expect(revokeEntry).toBeTruthy();
    expect(revokeEntry!.previous_status).toBe('approved');
    expect(revokeEntry!.new_status).toBe('pending');
  });

  // ─── STEP 13: Financial consistency ─────────────────────────────

  test('STEP 13: Balance matches sum of transactions after revoke', async ({
    page,
  }) => {
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    // XP: sum all amounts for this child
    const { data: xpAll } = await supabase
      .from('xp_transactions')
      .select('amount')
      .eq('member_id', family.childId);

    const xpSum = (xpAll || []).reduce(
      (sum: number, t: any) => sum + t.amount,
      0
    );

    // BHD: sum earned minus withdrawn/penalty for approved transactions
    const { data: moneyAll } = await supabase
      .from('money_transactions')
      .select('amount, type')
      .eq('member_id', family.childId)
      .eq('status', 'approved');

    const bhdSum = (moneyAll || []).reduce(
      (sum: number, t: any) =>
        sum + (t.type === 'earned' ? t.amount : -t.amount),
      0
    );

    // Get application-reported balances
    await resetRateLimitsForScope('member-login:300s');
    await loginAsChild(page, family.childLoginCode, family.childPin);

    const resp = await page.request.post('/api/child-mode/data', {
      data: { section: 'home' },
    });
    expect(resp.ok()).toBeTruthy();
    const body = await resp.json();

    const appXp = Number(body.xp) || 0;
    const appBhd = Number(body.money_balance) || 0;

    // Application balance should match DB sum
    expect(appXp).toBe(xpSum);
    expect(appBhd).toBe(bhdSum);
  });
});

// ─── No-money task: verify no incorrect BHD reversal ───────────

test.describe('P1.2.7-B: No-Money Task Revoke', () => {
  let family: TestFamily;
  let taskId: string;
  let completionId: string;

  test.beforeAll(async () => {
    family = await createTestFamily();
  });

  test.afterAll(async () => {
    await deleteTestFamily(family.familyId);
  });

  test('No-money task: approve and revoke creates no BHD reversal', async ({
    page,
  }) => {
    // Create task with XP only, no BHD
    await resetRateLimitsForScope('member-login:300s');
    await loginAsParent(page, family.parentLoginCode, family.parentPin);

    const createResp = await page.request.post('/api/tasks/create', {
      data: {
        title: 'XP-Only Task',
        xp_reward: 20,
        money_reward: 0,
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

    // Count BHD transactions before approval
    const { count: beforeCount } = await supabase
      .from('money_transactions')
      .select('id', { count: 'exact', head: true })
      .eq('member_id', family.childId)
      .eq('source', 'task')
      .eq('source_id', completionId);

    // Approve
    await loginAsParent(page, family.parentLoginCode, family.parentPin);
    const approveResp = await page.request.post('/api/tasks/approve', {
      data: { completion_id: completionId, approve: true },
    });
    expect(approveResp.ok()).toBeTruthy();

    // Verify no BHD transaction was created (money_reward = 0)
    const { count: afterApproveCount } = await supabase
      .from('money_transactions')
      .select('id', { count: 'exact', head: true })
      .eq('member_id', family.childId)
      .eq('source', 'task')
      .eq('source_id', completionId);

    expect(afterApproveCount).toBe(beforeCount);

    // Revoke
    const revokeResp = await page.request.post('/api/tasks/revoke', {
      data: { completion_id: completionId, reason: 'Test no-money revoke' },
    });
    expect(revokeResp.ok()).toBeTruthy();

    // Verify no BHD reversal was created
    const { count: afterRevokeCount } = await supabase
      .from('money_transactions')
      .select('id', { count: 'exact', head: true })
      .eq('member_id', family.childId)
      .eq('source', 'task')
      .eq('source_id', completionId);

    expect(afterRevokeCount).toBe(beforeCount);

    // Verify XP was still reversed
    const { data: xpReversals } = await supabase
      .from('xp_transactions')
      .select('amount')
      .eq('member_id', family.childId)
      .eq('source', 'task')
      .eq('source_id', completionId)
      .lt('amount', 0);

    expect(xpReversals).toBeTruthy();
    expect(xpReversals!.length).toBe(1);
    expect(xpReversals![0].amount).toBe(-20);
  });
});
