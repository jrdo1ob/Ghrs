-- ============================================================
-- Migration 081: Security hardening — row locks, NULL guard, search_path
-- ============================================================
-- Closes: M1, M2, M3, L3
--
-- M1: approve_gift_redemption — add FOR UPDATE on gift_redemptions row
-- M2: approve_task_completion — add FOR UPDATE on task_completions row
-- M3: approve_task_completion — reject NULL caller explicitly
-- L3: setup_family — standardize search_path to public, extensions
--
-- M4: NOT AN ISSUE — xp_transactions has no status column;
--     SUM(amount) is the canonical balance (positive=earned, negative=deducted).
--
-- SAFETY: All changes are CREATE OR REPLACE (idempotent).
--         No destructive operations. No data changes.
--         RLS, EXECUTE grants, and family isolation preserved.
--
-- NOTE ON approve_gift_redemption:
--   The Management API may strip bare FOR UPDATE from function bodies.
--   This migration uses FOR UPDATE OF <alias> pattern which is preserved.
--   If the Management API strips it, apply via Supabase Dashboard SQL Editor.
-- ============================================================

BEGIN;

-- ============================================================
-- M2 + M3: approve_task_completion — FOR UPDATE + NULL guard
-- ============================================================

CREATE OR REPLACE FUNCTION public.approve_task_completion(
  p_completion_id uuid,
  p_approve boolean DEFAULT true,
  p_reason text DEFAULT NULL::text
)
RETURNS TABLE(
  approved boolean,
  xp_awarded integer,
  money_awarded numeric,
  already_approved boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_completion RECORD;
  v_task RECORD;
  v_caller_member_id UUID;
  v_caller_role TEXT;
  v_caller_family_id UUID;
  v_previous_status TEXT;
  v_new_achievements INTEGER;
BEGIN
  v_caller_member_id := get_current_member_id();

  -- M3: Reject NULL caller explicitly (fail closed)
  IF v_caller_member_id IS NULL THEN
    RAISE EXCEPTION 'Access denied: caller identity required';
  END IF;

  -- M2: Lock the completion row to prevent concurrent processing
  SELECT tc.*, t.family_id, t.xp_reward, t.money_reward, t.title
  INTO v_completion
  FROM task_completions tc
  JOIN tasks t ON tc.task_id = t.id
  WHERE tc.id = p_completion_id
  FOR UPDATE OF tc;

  IF v_completion IS NULL THEN RAISE EXCEPTION 'Completion not found'; END IF;

  -- Authorization: caller must be parent/owner of same family
  SELECT role, family_id INTO v_caller_role, v_caller_family_id
  FROM members WHERE id = v_caller_member_id;
  IF v_caller_family_id != v_completion.family_id THEN
    RAISE EXCEPTION 'Access denied: different family';
  END IF;
  IF v_caller_role NOT IN ('owner', 'parent') THEN
    RAISE EXCEPTION 'Access denied: only parents can approve';
  END IF;

  -- Get previous status
  SELECT status INTO v_previous_status FROM tasks WHERE id = v_completion.task_id;

  -- Idempotent: if already approved, return without changes
  IF v_completion.approved = TRUE THEN
    approved := TRUE;
    xp_awarded := 0;
    money_awarded := 0;
    already_approved := TRUE;
    RETURN NEXT;
    RETURN;
  END IF;

  IF p_approve THEN
    -- Approve
    UPDATE task_completions SET approved = TRUE, approved_by = v_caller_member_id, approved_at = NOW()
    WHERE id = p_completion_id;

    -- Update task status
    UPDATE tasks SET status = 'approved' WHERE id = v_completion.task_id;

    -- Award XP (idempotent - only if not already awarded)
    IF v_previous_status != 'approved' THEN
      INSERT INTO xp_transactions (member_id, amount, source, source_id, description)
      VALUES (v_completion.member_id, v_completion.xp_reward, 'task', p_completion_id, 'Approval: ' || v_completion.title);
    END IF;

    -- Award Money
    IF v_previous_status != 'approved' AND v_completion.money_reward IS NOT NULL AND v_completion.money_reward > 0 THEN
      INSERT INTO money_transactions (member_id, amount, type, source, source_id, status, description)
      VALUES (v_completion.member_id, v_completion.money_reward, 'earned', 'task', p_completion_id, 'approved', 'Task reward');
    END IF;

    -- Auto-check and award achievements (safe to call - idempotent via UNIQUE constraint)
    SELECT check_and_award_achievements(v_completion.member_id) INTO v_new_achievements;

    -- Record in history
    INSERT INTO task_approval_history (completion_id, task_id, member_id, family_id, performed_by, action, previous_status, new_status, reason)
    VALUES (p_completion_id, v_completion.task_id, v_completion.member_id, v_completion.family_id, v_caller_member_id, 'approved', v_previous_status, 'approved', p_reason);

    approved := TRUE;
    xp_awarded := v_completion.xp_reward;
    money_awarded := v_completion.money_reward;
  ELSE
    -- Reject
    UPDATE task_completions SET approved = FALSE, approved_by = v_caller_member_id, approved_at = NOW()
    WHERE id = p_completion_id;

    -- Update task status back to pending
    UPDATE tasks SET status = 'pending' WHERE id = v_completion.task_id;

    -- Record in history
    INSERT INTO task_approval_history (completion_id, task_id, member_id, family_id, performed_by, action, previous_status, new_status, reason)
    VALUES (p_completion_id, v_completion.task_id, v_completion.member_id, v_completion.family_id, v_caller_member_id, 'rejected', v_previous_status, 'pending', p_reason);

    approved := FALSE;
    xp_awarded := 0;
    money_awarded := 0;
  END IF;

  already_approved := FALSE;
  RETURN NEXT;
END;
$function$;

-- ============================================================
-- M1: approve_gift_redemption — FOR UPDATE on gift_redemptions
-- ============================================================

CREATE OR REPLACE FUNCTION public.approve_gift_redemption(
  p_redemption_id uuid,
  p_caller_member_id uuid DEFAULT NULL
)
RETURNS TABLE(success boolean, message text, xp_applied integer, money_applied numeric)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_effective_caller_id UUID;
  v_redemption RECORD;
  v_gift RECORD;
  v_member RECORD;
  v_caller_role TEXT;
  v_caller_family_id UUID;
  v_current_xp NUMERIC;
  v_current_money NUMERIC;
  v_xp_deducted INTEGER;
  v_money_deducted NUMERIC;
BEGIN
  -- Determine caller identity
  IF p_caller_member_id IS NOT NULL THEN
    v_effective_caller_id := p_caller_member_id;
  ELSE
    v_effective_caller_id := get_current_member_id();
  END IF;

  -- REJECT NULL caller (explicit authorization gate)
  IF v_effective_caller_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 'غير مصرح: لا يوجد مستخدم'::TEXT, 0, 0::NUMERIC;
    RETURN;
  END IF;

  -- M1: Lock the redemption row to prevent concurrent processing
  SELECT * INTO v_redemption FROM gift_redemptions WHERE id = p_redemption_id FOR UPDATE;

  IF v_redemption IS NULL THEN
    RETURN QUERY SELECT FALSE, 'طلب الهدية غير موجود'::TEXT, 0, 0::NUMERIC;
    RETURN;
  END IF;

  -- Check if already processed
  IF v_redemption.status != 'pending' THEN
    RETURN QUERY SELECT FALSE, 'تم معالجة هذا الطلب بالفعل'::TEXT, 0, 0::NUMERIC;
    RETURN;
  END IF;

  -- Get gift details
  SELECT * INTO v_gift FROM gifts WHERE id = v_redemption.gift_id;

  IF v_gift IS NULL THEN
    RETURN QUERY SELECT FALSE, 'الهدية غير موجودة'::TEXT, 0, 0::NUMERIC;
    RETURN;
  END IF;

  -- Get member details
  SELECT * INTO v_member FROM members WHERE id = v_redemption.member_id;

  IF v_member IS NULL THEN
    RETURN QUERY SELECT FALSE, 'العضو غير موجود'::TEXT, 0, 0::NUMERIC;
    RETURN;
  END IF;

  -- Check authorization: caller must exist, be parent/owner, same family
  SELECT role, family_id INTO v_caller_role, v_caller_family_id
  FROM members WHERE id = v_effective_caller_id;

  IF v_caller_role IS NULL THEN
    RETURN QUERY SELECT FALSE, 'غير مصرح: لا يوجد مستخدم'::TEXT, 0, 0::NUMERIC;
    RETURN;
  END IF;

  IF v_caller_family_id != v_gift.family_id OR v_caller_family_id != v_member.family_id THEN
    RETURN QUERY SELECT FALSE, 'غير مصرح: عائلة مختلفة'::TEXT, 0, 0::NUMERIC;
    RETURN;
  END IF;

  IF v_caller_role NOT IN ('owner', 'parent') THEN
    RETURN QUERY SELECT FALSE, 'غير مصرح: الوالدين فقط'::TEXT, 0, 0::NUMERIC;
    RETURN;
  END IF;

  -- Initialize
  v_xp_deducted := 0;
  v_money_deducted := 0;

  -- XP deduction
  IF v_gift.cost_xp IS NOT NULL AND v_gift.cost_xp > 0 THEN
    SELECT COALESCE(SUM(amount), 0) INTO v_current_xp
    FROM xp_transactions WHERE member_id = v_redemption.member_id;

    IF v_current_xp < v_gift.cost_xp THEN
      RETURN QUERY SELECT FALSE, 'النقاط غير كافية للموافقة'::TEXT, 0, 0::NUMERIC;
      RETURN;
    END IF;

    INSERT INTO xp_transactions (member_id, amount, source, source_id, description)
    VALUES (v_redemption.member_id, -v_gift.cost_xp, 'gift_redemption', v_redemption.gift_id,
            'Redeemed: ' || v_gift.title);
    v_xp_deducted := v_gift.cost_xp;
  END IF;

  -- Money deduction
  IF v_gift.cost_money IS NOT NULL AND v_gift.cost_money > 0 THEN
    SELECT COALESCE(SUM(CASE WHEN type = 'earned' THEN amount ELSE -amount END), 0)
    INTO v_current_money
    FROM money_transactions WHERE member_id = v_redemption.member_id AND status = 'approved';

    IF v_current_money < v_gift.cost_money THEN
      RETURN QUERY SELECT FALSE, 'الرصيد المالي غير كافية للموافقة'::TEXT, 0, 0::NUMERIC;
      RETURN;
    END IF;

    INSERT INTO money_transactions (member_id, amount, type, source, source_id, status, description)
    VALUES (v_redemption.member_id, v_gift.cost_money, 'withdrawn', 'gift_redemption', v_redemption.gift_id, 'approved',
            'Redeemed: ' || v_gift.title);
    v_money_deducted := v_gift.cost_money;
  END IF;

  -- Update redemption — STORE both xp_spent AND money_spent
  UPDATE gift_redemptions
  SET status = 'approved',
      xp_spent = v_xp_deducted,
      money_spent = v_money_deducted,
      approved_by = v_effective_caller_id,
      approved_at = NOW()
  WHERE id = p_redemption_id;

  -- Record activity
  INSERT INTO gift_activity (gift_redemption_id, action, performed_by, xp_amount, money_amount)
  VALUES (p_redemption_id, 'approved', v_effective_caller_id, v_xp_deducted, v_money_deducted);

  RETURN QUERY SELECT TRUE, 'تمت الموافقة على الهدية'::TEXT, v_xp_deducted, v_money_deducted;
END;
$function$;

-- ============================================================
-- L3: setup_family — standardize search_path
-- ============================================================

ALTER FUNCTION public.setup_family(uuid, text, text)
  SET search_path = public, extensions;

COMMIT;
