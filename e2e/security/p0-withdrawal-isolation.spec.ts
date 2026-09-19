/**
 * P0-6: Withdrawal Cross-Family Isolation
 *
 * Tests both APPROVE and REJECT cross-family isolation.
 * NOTE: First test waits 65s to reset application-level rate limiter.
 */

import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import {
  createTestFamily,
  deleteTestFamily,
  type TestFamily,
} from '../fixtures/family';
import { loginAsParent, loginAsChild } from '../helpers/auth';

const SUPABASE_URL = process.env.E2E_SUPABASE_URL!;
const SERVICE_KEY = process.env.E2E_SUPABASE_SERVICE_ROLE_KEY!;

test.describe('P0-6: Withdrawal Cross-Family Isolation', () => {
  let familyA: TestFamily;
  let familyB: TestFamily;
  let familyBWithdrawalId: string;

  test.beforeAll(async () => {
    familyA = await createTestFamily();
    familyB = await createTestFamily();

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    await supabase.from('money_transactions').insert({
      member_id: familyB.childId,
      amount: 100,
      type: 'earned',
      source: 'task',
      status: 'approved',
      description: 'E2E test balance',
    });

    const { data: withdrawal } = await supabase
      .from('withdrawal_requests')
      .insert({
        member_id: familyB.childId,
        amount: 50,
        status: 'pending',
      })
      .select('id')
      .single();

    familyBWithdrawalId = withdrawal!.id;
  });

  test.afterAll(async () => {
    await deleteTestFamily(familyA.familyId);
    await deleteTestFamily(familyB.familyId);
  });

  test('Family A parent cannot approve Family B withdrawal', async ({
    page,
  }) => {
    // Wait for rate limiter reset
    await new Promise((resolve) => setTimeout(resolve, 65_000));

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: withdrawal } = await supabase
      .from('withdrawal_requests')
      .select('id, status, amount')
      .eq('id', familyBWithdrawalId)
      .single();

    expect(withdrawal).toBeTruthy();
    expect(withdrawal!.status).toBe('pending');

    await loginAsParent(page, familyA.parentLoginCode, familyA.parentPin);

    const response = await page.request.post('/api/withdrawals/approve', {
      data: { withdrawal_id: familyBWithdrawalId, action: 'approve' },
    });

    const { data: withdrawalAfter } = await supabase
      .from('withdrawal_requests')
      .select('status')
      .eq('id', familyBWithdrawalId)
      .single();

    expect(withdrawalAfter!.status).toBe('pending');
  });

  test('Family A parent cannot reject Family B withdrawal (H1)', async ({
    page,
  }) => {
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: withdrawal } = await supabase
      .from('withdrawal_requests')
      .select('id, status')
      .eq('id', familyBWithdrawalId)
      .single();

    expect(withdrawal).toBeTruthy();
    expect(withdrawal!.status).toBe('pending');

    await loginAsParent(page, familyA.parentLoginCode, familyA.parentPin);

    const response = await page.request.post('/api/withdrawals/approve', {
      data: { withdrawal_id: familyBWithdrawalId, action: 'reject' },
    });

    expect(response.status()).toBe(403);

    const body = await response.json();
    expect(body.success).toBe(false);

    const { data: withdrawalAfter } = await supabase
      .from('withdrawal_requests')
      .select('status')
      .eq('id', familyBWithdrawalId)
      .single();

    expect(withdrawalAfter!.status).toBe('pending');
  });

  test('Family B parent CAN reject their own withdrawal (control)', async ({
    page,
  }) => {
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: withdrawal } = await supabase
      .from('withdrawal_requests')
      .select('id, status')
      .eq('id', familyBWithdrawalId)
      .single();

    expect(withdrawal).toBeTruthy();
    expect(withdrawal!.status).toBe('pending');

    await loginAsParent(page, familyB.parentLoginCode, familyB.parentPin);

    const response = await page.request.post('/api/withdrawals/approve', {
      data: { withdrawal_id: familyBWithdrawalId, action: 'reject' },
    });

    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.success).toBe(true);

    const { data: withdrawalAfter } = await supabase
      .from('withdrawal_requests')
      .select('status')
      .eq('id', familyBWithdrawalId)
      .single();

    expect(withdrawalAfter!.status).toBe('rejected');
  });

  test('Rejecting nonexistent withdrawal returns 404', async ({ page }) => {
    await loginAsParent(page, familyA.parentLoginCode, familyA.parentPin);

    const response = await page.request.post('/api/withdrawals/approve', {
      data: {
        withdrawal_id: '00000000-0000-0000-0000-000000000000',
        action: 'reject',
      },
    });

    expect(response.status()).toBe(404);
  });

  test('Child cannot reject withdrawal', async ({ page }) => {
    await loginAsChild(page, familyA.childLoginCode, familyA.childPin);

    const response = await page.request.post('/api/withdrawals/approve', {
      data: { withdrawal_id: familyBWithdrawalId, action: 'reject' },
    });

    expect(response.status()).toBe(403);
  });
});
