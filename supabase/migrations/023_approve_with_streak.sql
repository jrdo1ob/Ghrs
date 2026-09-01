-- Migration 023: Update approve_task_completion to auto-update streak & achievements
-- Recreates approve_task_completion with streak and achievement checks

BEGIN;

CREATE OR REPLACE FUNCTION approve_task_completion(
  p_completion_id UUID,
  p_approve BOOLEAN DEFAULT TRUE
)
RETURNS TABLE(approved BOOLEAN, xp_awarded INTEGER, money_awarded NUMERIC, already_approved BOOLEAN) AS $$
DECLARE
  v_completion RECORD;
  v_task RECORD;
  v_caller_member_id UUID;
  v_caller_role TEXT;
  v_caller_family_id UUID;
  v_streak INTEGER;
  v_new_achievements INTEGER;
BEGIN
  v_caller_member_id := get_current_member_id();
  
  SELECT tc.*, t.family_id, t.xp_reward, t.money_reward, t.requires_approval
  INTO v_completion
  FROM task_completions tc
  JOIN tasks t ON tc.task_id = t.id
  WHERE tc.id = p_completion_id;
  
  IF v_completion IS NULL THEN
    RAISE EXCEPTION 'Completion not found';
  END IF;
  
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
  
  IF v_completion.approved IS NOT NULL THEN
    approved := v_completion.approved;
    xp_awarded := 0;
    money_awarded := 0;
    already_approved := TRUE;
    RETURN NEXT;
    RETURN;
  END IF;
  
  IF p_approve THEN
    UPDATE task_completions
    SET approved = TRUE, approved_by = v_caller_member_id, approved_at = NOW()
    WHERE id = p_completion_id;
    
    -- Award XP
    INSERT INTO xp_transactions (member_id, amount, source, source_id, description)
    VALUES (v_completion.member_id, v_completion.xp_reward, 'task', p_completion_id, 'Approval');

    -- Award money if applicable
    IF v_completion.money_reward IS NOT NULL AND v_completion.money_reward > 0 THEN
      INSERT INTO money_transactions (member_id, amount, type, source, source_id, status, description)
      VALUES (v_completion.member_id, v_completion.money_reward, 'earned', 'task', p_completion_id, 'approved', 'Task reward');
    END IF;
    
    -- Auto-update streak
    SELECT update_child_streak(v_completion.member_id) INTO v_streak;
    
    -- Auto-check and award achievements
    SELECT check_and_award_achievements(v_completion.member_id) INTO v_new_achievements;
    
    approved := TRUE;
    xp_awarded := v_completion.xp_reward;
    money_awarded := v_completion.money_reward;
  ELSE
    UPDATE task_completions
    SET approved = FALSE, approved_by = v_caller_member_id, approved_at = NOW()
    WHERE id = p_completion_id;
    
    approved := FALSE;
    xp_awarded := 0;
    money_awarded := 0;
  END IF;
  
  already_approved := FALSE;
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
