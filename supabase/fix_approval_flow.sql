-- ============================================
-- GHRS Approval Flow Fix
-- ============================================

-- Drop existing function with same name but different signature if exists
DROP FUNCTION IF EXISTS approve_task_completion(UUID, UUID);

CREATE OR REPLACE FUNCTION approve_task_completion(
  p_completion_id UUID,
  p_approved_by UUID
)
RETURNS VOID AS $$
DECLARE
  v_completion RECORD;
  v_task RECORD;
  v_member_family_id UUID;
  v_caller_family_id UUID;
  v_caller_role TEXT;
BEGIN
  -- Get completion record
  SELECT * INTO v_completion FROM task_completions WHERE id = p_completion_id;
  
  IF v_completion IS NULL THEN
    RAISE EXCEPTION 'Completion not found';
  END IF;
  
  IF v_completion.approved = TRUE THEN
    RAISE EXCEPTION 'Completion already approved';
  END IF;
  
  -- Get task
  SELECT * INTO v_task FROM tasks WHERE id = v_completion.task_id;
  
  IF v_task IS NULL THEN
    RAISE EXCEPTION 'Task not found';
  END IF;
  
  -- Get member's family
  SELECT family_id INTO v_member_family_id
  FROM members WHERE id = v_completion.member_id;
  
  IF v_member_family_id IS NULL THEN
    RAISE EXCEPTION 'Member not found';
  END IF;
  
  -- Family membership check
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
  
  -- Atomic: Update completion + insert XP + insert money
  UPDATE task_completions 
  SET approved = TRUE, 
      approved_by = p_approved_by,
      approved_at = NOW()
  WHERE id = p_completion_id;
  
  -- Award XP
  INSERT INTO xp_transactions (member_id, amount, source, source_id, description)
  VALUES (v_completion.member_id, v_task.xp_reward, 'task_approval', p_completion_id, 'Approval: ' || v_task.title);
  
  -- Award money if applicable
  IF v_task.money_reward IS NOT NULL AND v_task.money_reward > 0 THEN
    INSERT INTO money_transactions (member_id, amount, type, source, source_id, status, description)
    VALUES (v_completion.member_id, v_task.money_reward, 'earned', 'task_approval', p_completion_id, 'pending', 'Reward: ' || v_task.title);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
