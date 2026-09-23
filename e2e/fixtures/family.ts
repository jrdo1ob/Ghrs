import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import crypto from 'crypto';

function getSupabaseClient(): SupabaseClient {
  const url = process.env.E2E_SUPABASE_URL;
  const key = process.env.E2E_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      'E2E_SUPABASE_URL and E2E_SUPABASE_SERVICE_ROLE_KEY must be set in environment'
    );
  }
  return createClient(url, key);
}

/**
 * Generate a bcrypt hash using PostgreSQL's crypt() via the e2e_hash_pin RPC.
 * This ensures compatibility with PostgreSQL's login_with_code_and_pin verification.
 */
async function hashPin(
  supabase: SupabaseClient,
  pin: string
): Promise<string> {
  const { data, error } = await supabase.rpc('e2e_hash_pin', { pin });
  if (error || !data) {
    throw new Error(`Failed to hash PIN: ${error?.message || 'no data'}`);
  }
  return data as string;
}

export interface TestFamily {
  familyId: string;
  familyCode: string;
  parentId: string;
  parentLoginCode: string;
  parentPin: string;
  childId: string;
  childLoginCode: string;
  childPin: string;
}

/**
 * Creates an isolated test family with one parent and one child.
 * Uses direct DB inserts via service-role client.
 * PIN hashes are generated via PostgreSQL's crypt() for full compatibility.
 * All data is unique per call to avoid parallel-test collisions.
 */
export async function createTestFamily(): Promise<TestFamily> {
  const supabase = getSupabaseClient();
  const parentPin = '2468';
  const childPin = '1357';
  const timestamp = Date.now();
  const randomSuffix = crypto.randomBytes(6).toString('hex');
  const familyCode = `E2E${timestamp}${randomSuffix}`.toUpperCase().slice(0, 18);

  // 1. Create family
  const placeholderUserId = crypto.randomUUID();

  const { data: family, error: familyError } = await supabase
    .from('families')
    .insert({
      name: `Test Family ${timestamp}`,
      code: familyCode,
      created_by: placeholderUserId,
    })
    .select('id, code')
    .single();

  if (familyError) throw new Error(`Failed to create family: ${familyError.message}`);

  // 2. Create parent member
  const parentLoginCode = `${familyCode}-0001`;

  const { data: parent, error: parentError } = await supabase
    .from('members')
    .insert({
      family_id: family.id,
      name: 'Test Parent',
      role: 'parent',
      login_code: parentLoginCode,
    })
    .select('id')
    .single();

  if (parentError) throw new Error(`Failed to create parent: ${parentError.message}`);

  // 3. Create child member
  const childLoginCode = `${familyCode}-1001`;

  const { data: child, error: childError } = await supabase
    .from('members')
    .insert({
      family_id: family.id,
      name: 'Test Child',
      role: 'child',
      login_code: childLoginCode,
    })
    .select('id')
    .single();

  if (childError) throw new Error(`Failed to create child: ${childError.message}`);

  // 4. Generate bcrypt hashes via PostgreSQL (compatible with crypt() verification)
  const parentPinHash = await hashPin(supabase, parentPin);
  const childPinHash = await hashPin(supabase, childPin);

  // 5. Insert PIN records into family_pins
  const { error: parentPinError } = await supabase
    .from('family_pins')
    .insert({ member_id: parent.id, pin_hash: parentPinHash });

  if (parentPinError) {
    throw new Error(`Failed to create parent PIN: ${parentPinError.message}`);
  }

  const { error: childPinError } = await supabase
    .from('family_pins')
    .insert({ member_id: child.id, pin_hash: childPinHash });

  if (childPinError) {
    throw new Error(`Failed to create child PIN: ${childPinError.message}`);
  }

  // 6. Also set pin_hash on members table (fallback for login RPC)
  await supabase
    .from('members')
    .update({ pin_hash: parentPinHash })
    .eq('id', parent.id);

  await supabase
    .from('members')
    .update({ pin_hash: childPinHash })
    .eq('id', child.id);

  return {
    familyId: family.id,
    familyCode: family.code,
    parentId: parent.id,
    parentLoginCode,
    parentPin,
    childId: child.id,
    childLoginCode,
    childPin,
  };
}

/**
 * Deletes a test family and all associated data.
 * Uses DELETE CASCADE on families to clean up all child rows.
 */
export async function deleteTestFamily(familyId: string): Promise<void> {
  const supabase = getSupabaseClient();

  // Get member IDs for this family
  const { data: members } = await supabase
    .from('members')
    .select('id')
    .eq('family_id', familyId);

  if (members && members.length > 0) {
    const memberIds = members.map((m) => m.id);

    // Delete child records that reference members (not cascaded from families)
    await supabase.from('task_completions').delete().in('member_id', memberIds);
    await supabase.from('task_completions').delete().in('approved_by', memberIds);
    await supabase.from('money_transactions').delete().in('member_id', memberIds);
    await supabase.from('withdrawal_requests').delete().in('member_id', memberIds);
    await supabase.from('xp_transactions').delete().in('member_id', memberIds);
    await supabase.from('member_achievements').delete().in('member_id', memberIds);
    await supabase.from('daily_goals').delete().in('member_id', memberIds);
  }

  // Now delete the family (cascades to members, pins, sessions, etc.)
  const { error } = await supabase
    .from('families')
    .delete()
    .eq('id', familyId);

  if (error) {
    console.warn(`Failed to delete test family ${familyId}: ${error.message}`);
  }
}

/**
 * Verifies that a test family no longer exists (for cleanup verification).
 */
export async function verifyFamilyDeleted(familyId: string): Promise<boolean> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('families')
    .select('id')
    .eq('id', familyId)
    .maybeSingle();

  if (error) {
    console.warn(`Error checking family deletion: ${error.message}`);
    return false;
  }

  return data === null;
}
