-- ============================================
-- GHRS - RPC Functions
-- ============================================

-- ============================================
-- 1. verify_member_pin
-- ============================================
CREATE OR REPLACE FUNCTION verify_member_pin(
  p_member_id UUID,
  p_pin TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  stored_hash TEXT;
BEGIN
  SELECT pin_hash INTO stored_hash
  FROM family_pins
  WHERE member_id = p_member_id;

  IF stored_hash IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN stored_hash = crypt(p_pin, stored_hash);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 2. set_member_pin
-- ============================================
CREATE OR REPLACE FUNCTION set_member_pin(
  p_member_id UUID,
  p_pin TEXT
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO family_pins (member_id, pin_hash)
  VALUES (p_member_id, crypt(p_pin, gen_salt('bf')))
  ON CONFLICT (member_id) DO UPDATE
  SET pin_hash = crypt(p_pin, gen_salt('bf'));

  UPDATE members
  SET pin_hash = crypt(p_pin, gen_salt('bf'))
  WHERE id = p_member_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 3. get_family_member_codes
-- ============================================
CREATE OR REPLACE FUNCTION get_family_member_codes()
RETURNS TABLE(member_id UUID, member_name TEXT, member_role TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT m.id, m.name, m.role
  FROM members m
  WHERE m.family_id = (SELECT family_id FROM get_current_member());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================
-- 4. complete_task_with_rewards
-- ============================================
CREATE OR REPLACE FUNCTION complete_task_with_rewards(
  p_task_id UUID,
  p_member_id UUID
)
RETURNS VOID AS $$
DECLARE
  v_task RECORD;
  v_completion_id UUID;
BEGIN
  SELECT * INTO v_task FROM tasks WHERE id = p_task_id;

  IF v_task IS NULL THEN
    RAISE EXCEPTION 'Task not found';
  END IF;

  IF EXISTS (
    SELECT 1 FROM task_completions
    WHERE task_id = p_task_id AND member_id = p_member_id
    AND completed_at::date = NOW()::date
  ) THEN
    RAISE EXCEPTION 'Task already completed today';
  END IF;

  INSERT INTO task_completions (task_id, member_id, approved)
  VALUES (p_task_id, p_member_id, NOT v_task.requires_approval)
  RETURNING id INTO v_completion_id;

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
-- 5. mark_money_pending_as_paid
-- ============================================
CREATE OR REPLACE FUNCTION mark_money_pending_as_paid(
  p_transaction_id UUID
)
RETURNS VOID AS $$
BEGIN
  UPDATE money_transactions
  SET status = 'approved'
  WHERE id = p_transaction_id AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaction not found or not pending';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 6. mark_withdrawal_paid_with_transaction
-- ============================================
CREATE OR REPLACE FUNCTION mark_withdrawal_paid_with_transaction(
  p_withdrawal_id UUID
)
RETURNS VOID AS $$
DECLARE
  v_withdrawal RECORD;
BEGIN
  SELECT * INTO v_withdrawal FROM withdrawal_requests WHERE id = p_withdrawal_id;

  IF v_withdrawal IS NULL THEN
    RAISE EXCEPTION 'Withdrawal not found';
  END IF;

  UPDATE withdrawal_requests
  SET status = 'paid',
      processed_at = NOW()
  WHERE id = p_withdrawal_id;

  INSERT INTO money_transactions (member_id, amount, type, source, source_id, status, description)
  VALUES (v_withdrawal.member_id, v_withdrawal.amount, 'withdrawn', 'withdrawal', p_withdrawal_id, 'paid', 'Withdrawal');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 7. link_auth_identity_to_member
-- ============================================
CREATE OR REPLACE FUNCTION link_auth_identity_to_member(
  p_member_id UUID,
  p_auth_user_id UUID,
  p_provider TEXT DEFAULT 'email'
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO auth_identities (member_id, auth_user_id, provider)
  VALUES (p_member_id, p_auth_user_id, p_provider)
  ON CONFLICT (auth_user_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 8. get_current_member_info
-- ============================================
CREATE OR REPLACE FUNCTION get_current_member_info()
RETURNS TABLE(member_id UUID, member_name TEXT, family_id UUID, family_name TEXT, role TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT m.id, m.name, f.id, f.name, m.role
  FROM get_current_member() gcm
  JOIN members m ON m.id = gcm.member_id
  JOIN families f ON f.id = gcm.family_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
