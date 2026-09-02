-- Migration 027: Revoke Approval System
-- Adds revoke_task_approval RPC and updates approval history

BEGIN;

-- 1. Create revoke_task_approval RPC
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
BEGIN
  -- Get caller info
  v_caller_member_id := get_current_member_id();
  
  -- Get completion details
  SELECT tc.*, t.family_id, t.xp_reward, t.money_reward, t.title
  INTO v_completion
  FROM task_completions tc
  JOIN tasks t ON tc.task_id = t.id
  WHERE tc.id = p_completion_id;
  
  IF v_completion IS NULL THEN
    RAISE EXCEPTION 'Completion not found';
  END IF;
  
  -- Check authorization
  IF v_caller_member_id IS NOT NULL THEN
    SELECT role, family_id INTO v_caller_role, v_caller_family_id
    FROM members WHERE id = v_caller_member_id;
    
    IF v_caller_family_id != v_completion.family_id THEN
      RAISE EXCEPTION 'Access denied: different family';
    END IF;
    
    IF v_caller_role NOT IN ('owner', 'parent') THEN
      RAISE EXCEPTION 'Access denied: only parents can revoke approval';
    END IF;
  END IF;
  
  -- Check if currently approved
  IF v_completion.approved IS NOT TRUE THEN
    RETURN QUERY SELECT FALSE, 'المهمة ليست معتمدة حالياً';
    RETURN;
  END IF;
  
  -- Get previous status
  v_previous_status := 'approved';
  
  -- 1. Update completion status to revoked
  UPDATE task_completions
  SET approved = FALSE, approved_by = v_caller_member_id, approved_at = NOW()
  WHERE id = p_completion_id;
  
  -- 2. Reverse XP if it was awarded
  IF v_completion.xp_reward > 0 THEN
    INSERT INTO xp_transactions (member_id, amount, source, source_id, description)
    VALUES (v_completion.member_id, -v_completion.xp_reward, 'task', p_completion_id, 'Approval Reversal: ' || v_completion.title);
  END IF;
  
  -- 3. Reverse Money if it was awarded
  IF v_completion.money_reward IS NOT NULL AND v_completion.money_reward > 0 THEN
    INSERT INTO money_transactions (member_id, amount, type, source, source_id, status, description)
    VALUES (v_completion.member_id, v_completion.money_reward, 'penalty', 'task', p_completion_id, 'approved', 'Approval Reversal: ' || v_completion.title);
  END IF;
  
  -- 4. Record in approval history
  INSERT INTO task_approval_history (completion_id, task_id, member_id, family_id, performed_by, action, previous_status, new_status, reason)
  VALUES (p_completion_id, v_completion.task_id, v_completion.member_id, v_completion.family_id, v_caller_member_id, 'revoke', v_previous_status, 'revoked', p_reason);
  
  RETURN QUERY SELECT TRUE, 'تم سحب الاعتماد بنجاح';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
