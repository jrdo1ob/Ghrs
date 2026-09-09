-- ============================================================
-- Migration 047: Wire achievements to approve_task_completion
-- ============================================================
-- Add automatic achievement evaluation after approval.
-- This was originally in migration 023 but was removed in 034.
--
-- CHANGE: Add check_and_award_achievements call after XP/money award.
-- RETURN VALUE: UNCHANGED (approved, xp_awarded, money_awarded, already_approved)
--               The achievement call is internal only.
--
-- IDEMPOTENCY: Preserved. Already-approved returns early.
-- FAMILY: Preserved. Caller already validated.
-- TRANSACTION: Same function boundary (all-or-nothing).
-- ============================================================

BEGIN;

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
  
  SELECT tc.*, t.family_id, t.xp_reward, t.money_reward, t.title
  INTO v_completion
  FROM task_completions tc
  JOIN tasks t ON tc.task_id = t.id
  WHERE tc.id = p_completion_id;
  
  IF v_completion IS NULL THEN RAISE EXCEPTION 'Completion not found'; END IF;
  
  IF v_caller_member_id IS NOT NULL THEN
    SELECT role, family_id INTO v_caller_role, v_caller_family_id
    FROM members WHERE id = v_caller_member_id;
    IF v_caller_family_id != v_completion.family_id THEN
      RAISE EXCEPTION 'Access denied: different family';
    END IF;
    IF v_caller_role NOT IN ('owner', 'parent') THEN
      RAISE EXCEPTION 'Access denied: only parents can approve';
    END IF;
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

COMMIT;