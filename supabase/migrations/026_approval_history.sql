-- Migration 026: Task Approval History System
-- Creates approval history table and updates approval logic

BEGIN;

-- 1. Create approval history table
CREATE TABLE IF NOT EXISTS task_approval_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  completion_id UUID NOT NULL REFERENCES task_completions(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id),
  family_id UUID NOT NULL REFERENCES families(id),
  performed_by UUID NOT NULL REFERENCES members(id),
  action TEXT NOT NULL CHECK (action IN ('approve', 'reject')),
  previous_status TEXT,
  new_status TEXT NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Indexes
CREATE INDEX IF NOT EXISTS idx_approval_history_completion ON task_approval_history(completion_id);
CREATE INDEX IF NOT EXISTS idx_approval_history_task ON task_approval_history(task_id);
CREATE INDEX IF NOT EXISTS idx_approval_history_family ON task_approval_history(family_id);
CREATE INDEX IF NOT EXISTS idx_approval_history_created ON task_approval_history(created_at DESC);

-- 3. RLS policies
ALTER TABLE task_approval_history ENABLE ROW LEVEL SECURITY;

-- Parents can see history for their family
CREATE POLICY "Parents can view family approval history" 
ON task_approval_history FOR SELECT 
USING (true);

-- Parents can insert history
CREATE POLICY "Parents can insert approval history" 
ON task_approval_history FOR INSERT 
WITH CHECK (true);

-- 4. Update approve_task_completion to handle decision changes
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
  v_xp_amount INTEGER := 0;
  v_money_amount NUMERIC := 0;
BEGIN
  -- Get caller info
  v_caller_member_id := get_current_member_id();
  
  -- Get completion details
  SELECT tc.*, t.family_id, t.xp_reward, t.money_reward, t.requires_approval
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
      RAISE EXCEPTION 'Access denied: only parents can approve';
    END IF;
  END IF;
  
  -- Get previous status
  v_previous_status := CASE 
    WHEN v_completion.approved IS NULL THEN 'pending'
    WHEN v_completion.approved = TRUE THEN 'approved'
    WHEN v_completion.approved = FALSE THEN 'rejected'
    ELSE 'unknown'
  END;
  
  -- Process approval/rejection
  IF p_approve THEN
    UPDATE task_completions
    SET approved = TRUE, approved_by = v_caller_member_id, approved_at = NOW()
    WHERE id = p_completion_id;
    
    -- Award XP if not already awarded for this completion
    IF v_completion.approved IS NULL OR v_completion.approved = FALSE THEN
      INSERT INTO xp_transactions (member_id, amount, source, source_id, description)
      VALUES (v_completion.member_id, v_completion.xp_reward, 'task', p_completion_id, 'Approval: ' || v_completion.title);

      IF v_completion.money_reward IS NOT NULL AND v_completion.money_reward > 0 THEN
        INSERT INTO money_transactions (member_id, amount, type, source, source_id, status, description)
        VALUES (v_completion.member_id, v_completion.money_reward, 'earned', 'task', p_completion_id, 'approved', 'Task reward');
      END IF;
    END IF;
    
    -- Record in history
    INSERT INTO task_approval_history (completion_id, task_id, member_id, family_id, performed_by, action, previous_status, new_status, reason)
    VALUES (p_completion_id, v_completion.task_id, v_completion.member_id, v_completion.family_id, v_caller_member_id, 'approve', v_previous_status, 'approved', p_reason);
    
    approved := TRUE;
    xp_awarded := v_completion.xp_reward;
    money_awarded := v_completion.money_reward;
  ELSE
    UPDATE task_completions
    SET approved = FALSE, approved_by = v_caller_member_id, approved_at = NOW()
    WHERE id = p_completion_id;
    
    -- Record in history
    INSERT INTO task_approval_history (completion_id, task_id, member_id, family_id, performed_by, action, previous_status, new_status, reason)
    VALUES (p_completion_id, v_completion.task_id, v_completion.member_id, v_completion.family_id, v_caller_member_id, 'reject', v_previous_status, 'rejected', p_reason);
    
    approved := FALSE;
    xp_awarded := 0;
    money_awarded := 0;
  END IF;
  
  already_approved := FALSE;
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
