-- ============================================
-- Fix Critical: XP only on approval for tasks requiring approval
-- ============================================

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

  IF v_task IS NULL THEN
    RAISE EXCEPTION 'Task not found';
  END IF;

  v_task_family_id := v_task.family_id;

  SELECT family_id INTO v_member_family_id
  FROM members WHERE id = p_member_id;

  IF v_member_family_id IS NULL THEN
    RAISE EXCEPTION 'Member not found';
  END IF;

  IF v_task_family_id != v_member_family_id THEN
    RAISE EXCEPTION 'Not authorized: member and task belong to different families';
  END IF;

  INSERT INTO task_completions (task_id, member_id, approved)
  VALUES (p_task_id, p_member_id, NOT v_task.requires_approval)
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_completion_id;

  IF v_completion_id IS NULL THEN
    RAISE EXCEPTION 'Task already completed today';
  END IF;

  -- XP is only awarded immediately if NO approval required
  IF NOT v_task.requires_approval THEN
    INSERT INTO xp_transactions (member_id, amount, source, source_id, description)
    VALUES (p_member_id, v_task.xp_reward, 'task', p_completion_id, 'Completion: ' || v_task.title);
  END IF;

  -- Money is only awarded immediately if NO approval required
  IF NOT v_task.requires_approval AND v_task.money_reward IS NOT NULL AND v_task.money_reward > 0 THEN
    INSERT INTO money_transactions (member_id, amount, type, source, source_id, status, description)
    VALUES (p_member_id, v_task.money_reward, 'earned', 'task', p_completion_id, 'approved', 'Reward: ' || v_task.title);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
