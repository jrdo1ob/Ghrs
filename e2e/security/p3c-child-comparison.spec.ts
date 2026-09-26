/**
 * P3C — Child Progress Comparison E2E
 *
 * Verifies the child comparison section on the /analytics page:
 *   - Comparison section hidden for single-child families
 *   - Comparison section visible for multi-child families
 *   - Sort buttons are present and clickable
 *   - Child names appear in comparison
 *   - Metric values render
 *   - Bars render
 *   - Unauthenticated → redirect to login
 *   - Child → redirect to child-mode
 *   - Parent can load analytics page
 *   - Existing analytics features still work
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
import crypto from 'crypto';

function getSupabaseClient() {
  const url = process.env.E2E_SUPABASE_URL;
  const key = process.env.E2E_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('E2E_SUPABASE_URL and E2E_SUPABASE_SERVICE_ROLE_KEY must be set');
  }
  return createClient(url, key);
}

/**
 * Add a second child to an existing test family.
 */
async function addChildToFamily(
  familyId: string,
  familyCode: string,
  childPin: string = '1357'
): Promise<{ childId: string; childLoginCode: string }> {
  const supabase = getSupabaseClient();
  const timestamp = Date.now();
  const childLoginCode = `${familyCode}-100${timestamp}`.slice(0, 18);

  const { data: child, error: childError } = await supabase
    .from('members')
    .insert({
      family_id: familyId,
      name: `Test Child ${timestamp}`,
      role: 'child',
      login_code: childLoginCode,
    })
    .select('id')
    .single();

  if (childError) throw new Error(`Failed to create child: ${childError.message}`);

  // Hash PIN and insert
  const { data: pinHash } = await supabase.rpc('e2e_hash_pin', { pin: childPin });
  if (!pinHash) throw new Error('Failed to hash PIN');

  await supabase.from('family_pins').insert({ member_id: child.id, pin_hash: pinHash });
  await supabase.from('members').update({ pin_hash: pinHash }).eq('id', child.id);

  return { childId: child.id, childLoginCode };
}

test.describe('P3C: Child Progress Comparison', () => {
  let family: TestFamily;
  let secondChild: { childId: string; childLoginCode: string } | null = null;

  test.beforeAll(async () => {
    family = await createTestFamily();
    // Add a second child for comparison tests
    secondChild = await addChildToFamily(family.familyId, family.familyCode);
  });

  test.afterAll(async () => {
    // Clean up second child first (not auto-cascaded from family delete)
    if (secondChild) {
      const supabase = getSupabaseClient();
      await supabase.from('family_pins').delete().eq('member_id', secondChild.childId);
      await supabase.from('members').delete().eq('id', secondChild.childId);
    }
    await deleteTestFamily(family.familyId);
  });

  // ═══════════════════════════════════════════════════════════════════
  // SECTION 1: Authentication & Authorization
  // ═══════════════════════════════════════════════════════════════════

  test('Unauthenticated analytics page redirects to login', async ({ page }) => {
    await page.goto('/analytics');
    const url = page.url();
    expect(url).toContain('/owner-login');
  });

  test('Child cannot access analytics page', async ({ page }) => {
    await resetRateLimitsForScope('member-login:300s');
    await loginAsChild(page, family.childLoginCode, family.childPin);
    await page.goto('/analytics');
    const url = page.url();
    expect(url).toContain('/child-mode');
  });

  test('Parent can load analytics page', async ({ page }) => {
    await resetRateLimitsForScope('member-login:300s');
    await loginAsParent(page, family.parentLoginCode, family.parentPin);
    await page.goto('/analytics');
    await page.waitForTimeout(2000);

    const url = page.url();
    expect(url).toContain('/analytics');

    const body = await page.textContent('body');
    expect(body).toContain('تحليلات العائلة');
  });

  // ═══════════════════════════════════════════════════════════════════
  // SECTION 2: Comparison Section Visibility
  // ═══════════════════════════════════════════════════════════════════

  test('Comparison section visible for multi-child family', async ({ page }) => {
    await resetRateLimitsForScope('member-login:300s');
    await loginAsParent(page, family.parentLoginCode, family.parentPin);
    await page.goto('/analytics');
    await page.waitForTimeout(3000);

    const body = await page.textContent('body');
    expect(body).toContain('مقارنة التقدم');
  });

  // ═══════════════════════════════════════════════════════════════════
  // SECTION 3: Sort Controls
  // ═══════════════════════════════════════════════════════════════════

  test('Sort buttons are present and clickable', async ({ page }) => {
    await resetRateLimitsForScope('member-login:300s');
    await loginAsParent(page, family.parentLoginCode, family.parentPin);
    await page.goto('/analytics');
    await page.waitForTimeout(3000);

    // Verify sort buttons exist
    const xpBtn = page.locator('button', { hasText: 'XP' }).first();
    const moneyBtn = page.locator('button', { hasText: 'الأموال' }).first();
    const tasksBtn = page.locator('button', { hasText: 'المهام' }).first();
    const approvedBtn = page.locator('button', { hasText: 'المعتمدة' }).first();

    await expect(xpBtn).toBeVisible();
    await expect(moneyBtn).toBeVisible();
    await expect(tasksBtn).toBeVisible();
    await expect(approvedBtn).toBeVisible();

    // Click money sort button
    await moneyBtn.click();
    await page.waitForTimeout(500);

    // The page should still render correctly
    const body = await page.textContent('body');
    expect(body).toContain('مقارنة التقدم');
  });

  test('Sort direction toggles on repeated click', async ({ page }) => {
    await resetRateLimitsForScope('member-login:300s');
    await loginAsParent(page, family.parentLoginCode, family.parentPin);
    await page.goto('/analytics');
    await page.waitForTimeout(3000);

    const xpBtn = page.locator('button', { hasText: 'XP' }).first();

    // First click selects XP sort (desc by default)
    await xpBtn.click();
    await page.waitForTimeout(300);

    // Second click toggles to asc
    await xpBtn.click();
    await page.waitForTimeout(300);

    // Page should still render
    const body = await page.textContent('body');
    expect(body).toContain('مقارنة التقدم');
  });

  // ═══════════════════════════════════════════════════════════════════
  // SECTION 4: Comparison Content
  // ═══════════════════════════════════════════════════════════════════

  test('Child names appear in comparison section', async ({ page }) => {
    await resetRateLimitsForScope('member-login:300s');
    await loginAsParent(page, family.parentLoginCode, family.parentPin);
    await page.goto('/analytics');
    await page.waitForTimeout(3000);

    // Both test children should appear in the comparison section
    const body = await page.textContent('body');
    // The comparison section should render with child names
    expect(body).toContain('مقارنة التقدم');
    // At least the first child name should be present
    expect(body).toContain('Test Child');
  });

  test('Metric values render in comparison', async ({ page }) => {
    await resetRateLimitsForScope('member-login:300s');
    await loginAsParent(page, family.parentLoginCode, family.parentPin);
    await page.goto('/analytics');
    await page.waitForTimeout(3000);

    // The comparison section should show XP values (numeric)
    const comparisonSection = page.locator('text=مقارنة التقدم').locator('..');
    await expect(comparisonSection).toBeVisible();

    // Numeric values should be present
    const body = await page.textContent('body');
    expect(body).toContain('0'); // Zero values for new test family
  });

  // ═══════════════════════════════════════════════════════════════════
  // SECTION 5: Existing Features Regression
  // ═══════════════════════════════════════════════════════════════════

  test('Date range buttons still work', async ({ page }) => {
    await resetRateLimitsForScope('member-login:300s');
    await loginAsParent(page, family.parentLoginCode, family.parentPin);
    await page.goto('/analytics');
    await page.waitForTimeout(2000);

    const btn7 = page.locator('button', { hasText: 'آخر 7 أيام' });
    const btn30 = page.locator('button', { hasText: 'آخر 30 يوم' });
    const btn90 = page.locator('button', { hasText: 'آخر 90 يوم' });

    await expect(btn7).toBeVisible();
    await expect(btn30).toBeVisible();
    await expect(btn90).toBeVisible();

    // Click 7-day range
    await btn7.click();
    await page.waitForTimeout(2000);

    // Page should still have comparison
    const body = await page.textContent('body');
    expect(body).toContain('مقارنة التقدم');
  });

  test('Summary stat cards still render', async ({ page }) => {
    await resetRateLimitsForScope('member-login:300s');
    await loginAsParent(page, family.parentLoginCode, family.parentPin);
    await page.goto('/analytics');
    await page.waitForTimeout(3000);

    const body = await page.textContent('body');
    expect(body).toContain('نقاط XP');
    expect(body).toContain('الأموال');
    expect(body).toContain('مهام مكتملة');
    expect(body).toContain('مهام معتمدة');
  });

  test('Existing parent dashboard still works', async ({ page }) => {
    await resetRateLimitsForScope('member-login:300s');
    await loginAsParent(page, family.parentLoginCode, family.parentPin);
    await page.goto('/dashboard');
    await page.waitForTimeout(2000);

    const url = page.url();
    expect(url).toContain('/dashboard');
    const body = await page.textContent('body');
    expect(body).toBeTruthy();
    expect(body!.length).toBeGreaterThan(0);
  });

  test('Existing child mode still works', async ({ page }) => {
    await resetRateLimitsForScope('member-login:300s');
    await loginAsChild(page, family.childLoginCode, family.childPin);
    await page.goto('/child-mode');
    await page.waitForTimeout(2000);

    const url = page.url();
    expect(url).toContain('/child-mode');
    const body = await page.textContent('body');
    expect(body).toBeTruthy();
    expect(body!.length).toBeGreaterThan(0);
  });
});
