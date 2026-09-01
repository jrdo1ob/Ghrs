-- ============================================
-- GHRS Critical Fixes Migration v2
-- ============================================
-- Functions already exist with correct signatures.
-- This migration adds security fixes only.
-- ============================================

-- ============================================
-- 1. Fix set_member_pin - add permission check
-- ============================================
DROP FUNCTION IF EXISTS set_member_pin(UUID, TEXT);

CREATE OR REPLACE FUNCTION set_member_pin(
  p_member_id UUID,
  p_pin TEXT
)
RETURNS VOID AS $$
DECLARE
  v_caller_member_id UUID;
  v_caller_family_id UUID;
  v_target_family_id UUID;
  v_caller_role TEXT;
  v_hash TEXT;
BEGIN
  SELECT gcm.member_id, gcm.family_id, gcm.role 
  INTO v_caller_member_id, v_caller_family_id, v_caller_role
  FROM get_current_member() gcm;

  SELECT family_id INTO v_target_family_id
  FROM members WHERE id = p_member_id;

  IF v_target_family_id IS NULL THEN
    RAISE EXCEPTION 'Member not found';
  END IF;

  IF v_caller_member_id IS NOT NULL THEN
    IF p_member_id != v_caller_member_id AND v_caller_family_id != v_target_family_id THEN
      RAISE EXCEPTION 'Not authorized: different family';
    END IF;
    IF p_member_id != v_caller_member_id AND v_caller_role NOT IN ('owner', 'parent') THEN
      RAISE EXCEPTION 'Not authorized: not a parent';
    END IF;
  END IF;

  v_hash := crypt(p_pin, gen_salt('bf'));

  INSERT INTO family_pins (member_id, pin_hash)
  VALUES (p_member_id, v_hash)
  ON CONFLICT (member_id) DO UPDATE
  SET pin_hash = v_hash;

  UPDATE members
  SET pin_hash = v_hash
  WHERE id = p_member_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 2. Fix complete_task_with_rewards - add family check + fix race condition
-- ============================================
DROP FUNCTION IF EXISTS complete_task_with_rewards(UUID, UUID);

CREATE OR REPLACE FUNCTION complete_task_with_rewards(
  p_task_id UUID,
  p_member_id UUID
)
RETURNS VOID AS $$
DECLARE
  v_task RECORD;
  v_task_family_id UUID;
  v_member_family_id UUID;
  v_completion_id UUID;
BEGIN
  SELECT * INTO v_task FROM tasks WHERE id = p_task_id;

  IF v_task IS NULL THEN
    RAISE EXCEPTION 'Task not found';
  END IF;

  v_task_family_id := v_task.family_id;

  SELECT family_id INTO v_member_family_id
  FROM members WHERE id = p_member_id;

  IF v_member_family_id IS NULL THEN
    RAISE EXCEPTION 'Member not found';
  END IF;

  IF v_task_family_id != v_member_family_id THEN
    RAISE EXCEPTION 'Not authorized: member and task belong to different families';
  END IF;

  INSERT INTO task_completions (task_id, member_id, approved)
  VALUES (p_task_id, p_member_id, NOT v_task.requires_approval)
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_completion_id;

  IF v_completion_id IS NULL THEN
    RAISE EXCEPTION 'Task already completed today';
  END IF;

  INSERT INTO xp_transactions (member_id, amount, source, source_id, description)
  VALUES (p_member_id, v_task.xp_reward, 'task', p_task_id, 'Completion: ' || v_task.title);

  IF v_task.money_reward IS NOT NULL AND v_task.money_reward > 0 THEN
    INSERT INTO money_transactions (member_id, amount, type, source, source_id, status, description)
    VALUES (p_member_id, v_task.money_reward, 'earned', 'task', p_task_id,
            CASE WHEN v_task.requires_approval THEN 'pending' ELSE 'approved' END,
            'Reward: ' || v_task.title);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 3. Fix mark_money_pending_as_paid - add family check
-- ============================================
DROP FUNCTION IF EXISTS mark_money_pending_as_paid(UUID);

CREATE OR REPLACE FUNCTION mark_money_pending_as_paid(
  p_transaction_id UUID
)
RETURNS VOID AS $$
DECLARE
  v_transaction_family_id UUID;
  v_caller_family_id UUID;
BEGIN
  SELECT m.family_id INTO v_transaction_family_id
  FROM money_transactions mt
  JOIN members m ON m.id = mt.member_id
  WHERE mt.id = p_transaction_id;

  IF v_transaction_family_id IS NULL THEN
    RAISE EXCEPTION 'Transaction not found';
  END IF;

  SELECT family_id INTO v_caller_family_id
  FROM get_current_member();

  IF v_caller_family_id IS NOT NULL AND v_transaction_family_id != v_caller_family_id THEN
    RAISE EXCEPTION 'Not authorized: different family';
  END IF;

  UPDATE money_transactions
  SET status = 'approved'
  WHERE id = p_transaction_id AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaction not found or not pending';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 4. Fix mark_withdrawal_paid_with_transaction - add family check
-- ============================================
DROP FUNCTION IF EXISTS mark_withdrawal_paid_with_transaction(UUID);

CREATE OR REPLACE FUNCTION mark_withdrawal_paid_with_transaction(
  p_withdrawal_id UUID
)
RETURNS VOID AS $$
DECLARE
  v_withdrawal RECORD;
  v_caller_family_id UUID;
BEGIN
  SELECT * INTO v_withdrawal FROM withdrawal_requests WHERE id = p_withdrawal_id;

  IF v_withdrawal IS NULL THEN
    RAISE EXCEPTION 'Withdrawal not found';
  END IF;

  SELECT family_id INTO v_caller_family_id
  FROM get_current_member();

  IF v_caller_family_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM members m WHERE m.id = v_withdrawal.member_id AND m.family_id = v_caller_family_id
    ) THEN
      RAISE EXCEPTION 'Not authorized: different family';
    END IF;
  END IF;

  UPDATE withdrawal_requests
  SET status = 'paid',
      processed_at = NOW()
  WHERE id = p_withdrawal_id AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Withdrawal not found or not pending';
  END IF;

  INSERT INTO money_transactions (member_id, amount, type, source, source_id, status, description)
  VALUES (v_withdrawal.member_id, v_withdrawal.amount, 'withdrawn', 'withdrawal', p_withdrawal_id, 'paid', 'Withdrawal');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 5. Fix link_auth_identity_to_member - add permission check
-- ============================================
DROP FUNCTION IF EXISTS link_auth_identity_to_member(UUID, UUID, TEXT);

CREATE OR REPLACE FUNCTION link_auth_identity_to_member(
  p_member_id UUID,
  p_auth_user_id UUID,
  p_provider TEXT DEFAULT 'email'
)
RETURNS VOID AS $$
DECLARE
  v_caller_family_id UUID;
  v_target_family_id UUID;
BEGIN
  SELECT family_id INTO v_caller_family_id
  FROM get_current_member();

  SELECT family_id INTO v_target_family_id
  FROM members WHERE id = p_member_id;

  IF v_target_family_id IS NULL THEN
    RAISE EXCEPTION 'Member not found';
  END IF;

  IF v_caller_family_id IS NOT NULL AND v_target_family_id != v_caller_family_id THEN
    RAISE EXCEPTION 'Not authorized: cannot link auth to member of different family';
  END IF;

  INSERT INTO auth_identities (member_id, auth_user_id, provider)
  VALUES (p_member_id, p_auth_user_id, p_provider)
  ON CONFLICT (auth_user_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 6. Add missing RLS policies for family_invitations
-- ============================================
DO $$ BEGIN
  CREATE POLICY "Family members can view invitations"
    ON family_invitations FOR SELECT
    USING (is_family_member(family_id));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Parents can create invitations"
    ON family_invitations FOR INSERT
    WITH CHECK (is_family_parent() AND is_family_member(family_id));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Parents can update invitations"
    ON family_invitations FOR UPDATE
    USING (is_family_member(family_id) AND is_family_parent());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- 7. Add missing RLS policies for withdrawal_requests
-- ============================================
DO $$ BEGIN
  CREATE POLICY "Members can view their own withdrawals"
    ON withdrawal_requests FOR SELECT
    USING (member_id = (SELECT member_id FROM get_current_member()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Parents can view family withdrawals"
    ON withdrawal_requests FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM members m
        WHERE m.id = withdrawal_requests.member_id
        AND is_family_member(m.family_id)
        AND is_family_parent()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Members can create their own withdrawals"
    ON withdrawal_requests FOR INSERT
    WITH CHECK (member_id = (SELECT member_id FROM get_current_member()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Parents can update family withdrawals"
    ON withdrawal_requests FOR UPDATE
    USING (
      EXISTS (
        SELECT 1 FROM members m
        WHERE m.id = withdrawal_requests.member_id
        AND is_family_member(m.family_id)
        AND is_family_parent()
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- 8. Fix members INSERT RLS - validate family_id
-- ============================================
DROP POLICY IF EXISTS "Parents can add family members" ON members;

CREATE POLICY "Parents can add family members"
  ON members FOR INSERT
  WITH CHECK (
    is_family_parent()
    AND family_id = (SELECT family_id FROM get_current_member())
  );

-- ============================================
-- 9. Add missing indexes for performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_task_completions_member_approved ON task_completions(member_id, approved);
CREATE INDEX IF NOT EXISTS idx_task_completions_task_member_date ON task_completions(task_id, member_id, completed_at);
CREATE INDEX IF NOT EXISTS idx_money_transactions_member_status ON money_transactions(member_id, status);
CREATE INDEX IF NOT EXISTS idx_money_transactions_member_created ON money_transactions(member_id, created_at);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_member_status ON withdrawal_requests(member_id, status);
CREATE INDEX IF NOT EXISTS idx_quran_progress_member_surah ON quran_progress(member_id, surah);
CREATE INDEX IF NOT EXISTS idx_family_pins_member_id ON family_pins(member_id);

-- ============================================
-- 10. Fix seed data - fix Chinese text
-- ============================================
UPDATE achievement_definitions 
SET title = 'خبير الادخار', description = 'ادّخر 100 وحدة مالية'
WHERE title = '储蓄达人';

-- ============================================
-- 11. Add missing CHECK constraints
-- ============================================
DO $$ BEGIN
  ALTER TABLE xp_transactions ADD CONSTRAINT xp_amount_check CHECK (amount != 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE money_transactions ADD CONSTRAINT money_amount_check CHECK (amount > 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE withdrawal_requests ADD CONSTRAINT withdrawal_amount_check CHECK (amount > 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE gifts ADD CONSTRAINT gift_cost_check CHECK (cost_xp > 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE quran_progress ADD CONSTRAINT surah_check CHECK (surah BETWEEN 1 AND 114);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE quran_progress ADD CONSTRAINT ayah_check CHECK (ayah > 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
