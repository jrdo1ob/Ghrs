-- Migration 066: Atomic withdrawal approval RPC
-- P0 #7 remediation: prevent double-deduction and inconsistent financial state
--
-- Creates approve_withdrawal RPC that performs the entire approval
-- inside a single PostgreSQL transaction with row-level locking.

BEGIN;

-- ============================================================
-- 1. Create atomic approve_withdrawal RPC
-- ============================================================

CREATE OR REPLACE FUNCTION public.approve_withdrawal(
  p_withdrawal_id UUID,
  p_approver_member_id UUID DEFAULT NULL::UUID
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT,
  amount_applied NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_effective_caller_id UUID;
  v_withdrawal RECORD;
  v_caller_role TEXT;
  v_caller_family_id UUID;
  v_child_family_id UUID;
  v_current_balance NUMERIC;
  v_member RECORD;
BEGIN
  -- Determine caller identity
  IF p_approver_member_id IS NOT NULL THEN
    v_effective_caller_id := p_approver_member_id;
  ELSE
    v_effective_caller_id := get_current_member_id();
  END IF;

  -- Reject NULL caller (explicit authorization gate)
  IF v_effective_caller_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 'غير مصرح: لا يوجد مستخدم'::TEXT, 0::NUMERIC;
    RETURN;
  END IF;

  -- Lock the withdrawal row to prevent concurrent processing
  SELECT * INTO v_withdrawal
  FROM withdrawal_requests
  WHERE id = p_withdrawal_id
  FOR UPDATE;

  IF v_withdrawal IS NULL THEN
    RETURN QUERY SELECT FALSE, 'طلب السحب غير موجود'::TEXT, 0::NUMERIC;
    RETURN;
  END IF;

  -- Check if already processed
  IF v_withdrawal.status != 'pending' THEN
    RETURN QUERY SELECT FALSE, 'تم معالجة هذا الطلب بالفعل'::TEXT, 0::NUMERIC;
    RETURN;
  END IF;

  -- Verify caller authorization: parent/owner, same family
  SELECT role, family_id INTO v_caller_role, v_caller_family_id
  FROM members WHERE id = v_effective_caller_id;

  IF v_caller_role IS NULL THEN
    RETURN QUERY SELECT FALSE, 'غير مصرح: لا يوجد مستخدم'::TEXT, 0::NUMERIC;
    RETURN;
  END IF;

  IF v_caller_role NOT IN ('owner', 'parent') THEN
    RETURN QUERY SELECT FALSE, 'غير مصرح: الوالدين فقط'::TEXT, 0::NUMERIC;
    RETURN;
  END IF;

  -- Verify child belongs to same family
  SELECT family_id INTO v_child_family_id
  FROM members WHERE id = v_withdrawal.member_id;

  IF v_child_family_id IS NULL OR v_child_family_id != v_caller_family_id THEN
    RETURN QUERY SELECT FALSE, 'طلب السحب لا ينتمي لعائلتك'::TEXT, 0::NUMERIC;
    RETURN;
  END IF;

  -- Lock the child's member row to serialize balance changes for same child
  -- This prevents concurrent withdrawals/gifts from overdrawing the same balance
  SELECT * INTO v_member
  FROM members
  WHERE id = v_withdrawal.member_id
  FOR UPDATE;

  -- Calculate available balance (after member row lock, after withdrawal row lock)
  SELECT COALESCE(SUM(CASE WHEN type = 'earned' THEN amount ELSE -amount END), 0)
  INTO v_current_balance
  FROM money_transactions
  WHERE member_id = v_withdrawal.member_id
    AND status = 'approved';

  IF v_current_balance < v_withdrawal.amount THEN
    RETURN QUERY SELECT FALSE, 'الرصيد غير كافي للموافقة'::TEXT, 0::NUMERIC;
    RETURN;
  END IF;

  -- Atomic claim: CONDITIONAL UPDATE ensures only one concurrent transaction succeeds.
  -- If another transaction already changed status from 'pending', this affects 0 rows.
  UPDATE withdrawal_requests
  SET status = 'paid',
      processed_by = v_effective_caller_id,
      processed_at = NOW()
  WHERE id = p_withdrawal_id AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'تم معالجة هذا الطلب بالفعل';
  END IF;

  -- Insert money deduction ONLY AFTER successfully claiming the withdrawal
  INSERT INTO money_transactions (member_id, amount, type, source, source_id, status, description)
  VALUES (
    v_withdrawal.member_id,
    v_withdrawal.amount,
    'withdrawn',
    'withdrawal',
    p_withdrawal_id,
    'approved',
    'سحب من الرصيد'
  );

  RETURN QUERY SELECT TRUE, 'تمت الموافقة على السحب'::TEXT, v_withdrawal.amount::NUMERIC;
END;
$$;

-- ============================================================
-- 2. Grant EXECUTE to service_role only
-- ============================================================

GRANT EXECUTE ON FUNCTION public.approve_withdrawal(UUID, UUID) TO service_role;

-- ============================================================
-- 3. Revoke from browser-facing roles
-- ============================================================

REVOKE EXECUTE ON FUNCTION public.approve_withdrawal(UUID, UUID) FROM PUBLIC, anon, authenticated;

COMMIT;
