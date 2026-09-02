-- Migration 034: Task Lifecycle - Status Field & RPC Updates
-- Adds status field and updates all RPCs for proper lifecycle management

BEGIN;

-- 1. Add status column to tasks
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' 
  CHECK (status IN ('pending', 'completed', 'approved'));

-- 2. Update CHECK constraint on task_approval_history
-- First drop the existing constraint
ALTER TABLE task_approval_history DROP CONSTRAINT IF EXISTS task_approval_history_action_check;

-- Add new constraint with all allowed values
ALTER TABLE task_approval_history ADD CONSTRAINT task_approval_history_action_check
  CHECK (action IN ('approved', 'rejected', 'revoked', 'completed', 'pending'));

-- 3. Update complete_task_with_rewards to set status=completed
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
  IF v_task IS NULL THEN RAISE EXCEPTION 'Task not found'; END IF;

  v_task_family_id := v_task.family_id;
  SELECT family_id INTO v_member_family_id FROM members WHERE id = p_member_id;
  IF v_member_family_id IS NULL THEN RAISE EXCEPTION 'Member not found'; END IF;
  IF v_task_family_id != v_member_family_id THEN
    RAISE EXCEPTION 'Not authorized: member and task belong to different families';
  END IF;

  -- Set status to completed (not approved yet if requires_approval)
  INSERT INTO task_completions (task_id, member_id, approved)
  VALUES (p_task_id, p_member_id, 
    CASE WHEN v_task.requires_approval THEN NULL ELSE TRUE END
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_completion_id;

  IF v_completion_id IS NULL THEN
    RAISE EXCEPTION 'Task already completed today';
  END IF;

  -- Update task status
  UPDATE tasks SET status = 'completed' WHERE id = p_task_id;

  -- Record completion in history
  INSERT INTO task_approval_history (completion_id, task_id, member_id, family_id, performed_by, action, previous_status, new_status)
  VALUES (v_completion_id, p_task_id, p_member_id, v_task_family_id, p_member_id, 'completed', 'pending', 'completed');

  -- XP only if no approval required
  IF NOT v_task.requires_approval THEN
    UPDATE tasks SET status = 'approved' WHERE id = p_task_id;
    INSERT INTO xp_transactions (member_id, amount, source, source_id, description)
    VALUES (p_member_id, v_task.xp_reward, 'task', v_completion_id, 'Completion: ' || v_task.title);
  END IF;

  -- Money only if no approval required
  IF NOT v_task.requires_approval AND v_task.money_reward IS NOT NULL AND v_task.money_reward > 0 THEN
    INSERT INTO money_transactions (member_id, amount, type, source, source_id, status, description)
    VALUES (p_member_id, v_task.money_reward, 'earned', 'task', v_completion_id, 'approved', 'Reward: ' || v_task.title);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Update approve_task_completion
DROP FUNCTION IF EXISTS approve_task_completion(UUID, BOOLEAN, TEXT);
CREATE OR REPLACE FUNCTION approve_task_completion(
  p_completion_id UUID,
  p_approve BOOLEAN DEFAULT TRUE,
  p_reason TEXT DEFAULT NULL
)
RETURNS TABLE(approved BOOLEAN, xp_awarded INTEGER, money_awarded NUMERIC, already_approved BOOLEAN) AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Update revoke_task_approval
DROP FUNCTION IF EXISTS revoke_task_approval(UUID, TEXT);
CREATE OR REPLACE FUNCTION revoke_task_approval(
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
  v_xp_amount INTEGER;
BEGIN
  v_caller_member_id := get_current_member_id();
  
  SELECT tc.*, t.family_id, t.xp_reward, t.title
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

  -- Record in history
  INSERT INTO task_approval_history (completion_id, task_id, member_id, family_id, performed_by, action, previous_status, new_status, reason)
  VALUES (p_completion_id, v_completion.task_id, v_completion.member_id, v_completion.family_id, v_caller_member_id, 'revoked', v_previous_status, 'pending', p_reason);

  RETURN QUERY SELECT TRUE, 'Approval revoked successfully';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
