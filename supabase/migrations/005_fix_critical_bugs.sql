-- ============================================
-- Fix Critical: Double XP in approve_task_completion
-- ============================================

-- Drop old function
DROP FUNCTION IF EXISTS approve_task_completion(UUID, UUID);

CREATE OR REPLACE FUNCTION approve_task_completion(
  p_completion_id UUID,
  p_approved_by UUID
)
RETURNS TABLE(approved BOOLEAN, xp_awarded INTEGER, money_awarded INTEGER, already_approved BOOLEAN) AS $$
DECLARE
  v_completion RECORD;
  v_task RECORD;
  v_member_family_id UUID;
  v_caller_family_id UUID;
  v_caller_role TEXT;
  v_xp_amount INTEGER := 0;
  v_money_amount INTEGER := 0;
BEGIN
  SELECT * INTO v_completion FROM task_completions WHERE id = p_completion_id;

  IF v_completion IS NULL THEN
    RAISE EXCEPTION 'Completion not found';
  END IF;

  IF v_completion.approved = TRUE THEN
    RETURN QUERY SELECT FALSE, 0, 0, TRUE;
    RETURN;
  END IF;

  SELECT * INTO v_task FROM tasks WHERE id = v_completion.task_id;

  IF v_task IS NULL THEN
    RAISE EXCEPTION 'Task not found';
  END IF;

  SELECT family_id INTO v_member_family_id
  FROM members WHERE id = v_completion.member_id;

  IF v_member_family_id IS NULL THEN
    RAISE EXCEPTION 'Member not found';
  END IF;

  SELECT family_id, role INTO v_caller_family_id, v_caller_role
  FROM get_current_member();

  IF v_caller_family_id IS NOT NULL THEN
    IF v_task.family_id != v_caller_family_id THEN
      RAISE EXCEPTION 'Not authorized: different family';
    END IF;
    IF v_caller_role NOT IN ('owner', 'parent') THEN
      RAISE EXCEPTION 'Not authorized: not a parent';
    END IF;
  END IF;

  UPDATE task_completions
  SET approved = TRUE,
      approved_by = p_approved_by,
      approved_at = NOW()
  WHERE id = p_completion_id;

  IF v_task.requires_approval THEN
    v_xp_amount := v_task.xp_reward;

    INSERT INTO xp_transactions (member_id, amount, source, source_id, description)
    VALUES (v_completion.member_id, v_xp_amount, 'task', p_completion_id, 'Approval: ' || v_task.title);

    IF v_task.money_reward IS NOT NULL AND v_task.money_reward > 0 THEN
      v_money_amount := v_task.money_reward;
      INSERT INTO money_transactions (member_id, amount, type, source, source_id, status, description)
      VALUES (v_completion.member_id, v_money_amount, 'earned', 'task', p_completion_id, 'pending', 'Reward: ' || v_task.title);
    END IF;
  END IF;

  RETURN QUERY SELECT TRUE, v_xp_amount, v_money_amount, FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
