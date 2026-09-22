-- Migration 075: Fix revoke_task_approval BHD money reversal
-- Regression fix: migration 0340 replaced revoke_task_approval but dropped the
-- BHD money reversal that existed in migration 027.
--
-- Root cause: When a task with money_reward > 0 is approved, both XP and BHD
-- are awarded. When that approval is revoked, only XP is currently reversed.
-- The BHD reward is not clawed back, leaving the child financially credited
-- after revocation.
--
-- Fix: Add money_transactions reversal to revoke_task_approval, matching the
-- semantics of the original migration 027 implementation.
--
-- Reversal semantics:
--   - Uses type='penalty' (consistent with migration 027 and CHECK constraint
--     requiring amount > 0; sign is encoded via type column)
--   - source='task', source_id=p_completion_id (links to the original reward)
--   - status='approved' (penalty is immediately effective)
--   - amount = v_completion.money_reward (the actual approved reward amount,
--     stored on the task record; unaffected by later price changes)
--   - Only inserted when money_reward IS NOT NULL AND money_reward > 0
--   - No duplicate reversal possible: revocation can only happen once
--     (checked by v_completion.approved IS NOT TRUE guard)

BEGIN;

CREATE OR REPLACE FUNCTION public.revoke_task_approval(
  p_completion_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS TABLE(success BOOLEAN, message TEXT) AS $$
DECLARE
  v_completion RECORD;
  v_task RECORD;
  v_caller_member_id UUID;
  v_caller_role TEXT;
  v_caller_family_id UUID;
  v_previous_status TEXT;
BEGIN
  v_caller_member_id := get_current_member_id();
  
  SELECT tc.*, t.family_id, t.xp_reward, t.money_reward, t.title
  INTO v_completion
  FROM task_completions tc
  JOIN tasks t ON tc.task_id = t.id
  WHERE tc.id = p_completion_id;
  
  IF v_completion IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Completion not found';
    RETURN;
  END IF;

  IF v_caller_member_id IS NOT NULL THEN
    SELECT role, family_id INTO v_caller_role, v_caller_family_id
    FROM members WHERE id = v_caller_member_id;
    IF v_caller_family_id != v_completion.family_id THEN
      RETURN QUERY SELECT FALSE, 'Access denied: different family';
      RETURN;
    END IF;
    IF v_caller_role NOT IN ('owner', 'parent') THEN
      RETURN QUERY SELECT FALSE, 'Access denied: only parents can revoke';
      RETURN;
    END IF;
  END IF;

  -- Can only revoke if currently approved
  IF v_completion.approved IS NOT TRUE THEN
    RETURN QUERY SELECT FALSE, 'Completion is not approved';
    RETURN;
  END IF;

  -- Get previous status
  SELECT status INTO v_previous_status FROM tasks WHERE id = v_completion.task_id;

  -- Revoke: set approved back to NULL and status to pending
  UPDATE task_completions SET approved = NULL, approved_by = NULL, approved_at = NULL
  WHERE id = p_completion_id;

  -- Update task status back to pending
  UPDATE tasks SET status = 'pending' WHERE id = v_completion.task_id;

  -- Reverse XP (idempotent - only if was previously approved)
  IF v_previous_status = 'approved' AND v_completion.xp_reward > 0 THEN
    INSERT INTO xp_transactions (member_id, amount, source, source_id, description)
    VALUES (v_completion.member_id, -v_completion.xp_reward, 'task', p_completion_id, 'Approval Reversal: ' || v_completion.title);
  END IF;

  -- Reverse BHD (idempotent - only if money was awarded)
  IF v_previous_status = 'approved' AND v_completion.money_reward IS NOT NULL AND v_completion.money_reward > 0 THEN
    INSERT INTO money_transactions (member_id, amount, type, source, source_id, status, description)
    VALUES (v_completion.member_id, v_completion.money_reward, 'withdrawn', 'task', p_completion_id, 'approved', 'Approval Reversal: ' || v_completion.title);
  END IF;

  -- Record in history
  INSERT INTO task_approval_history (completion_id, task_id, member_id, family_id, performed_by, action, previous_status, new_status, reason)
  VALUES (p_completion_id, v_completion.task_id, v_completion.member_id, v_completion.family_id, v_caller_member_id, 'revoked', v_previous_status, 'pending', p_reason);

  RETURN QUERY SELECT TRUE, 'Approval revoked successfully';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
