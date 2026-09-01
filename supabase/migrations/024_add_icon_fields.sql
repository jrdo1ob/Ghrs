-- Migration 024: Add icon field to tasks and gifts tables
-- Enables dynamic icon picker for tasks and rewards

BEGIN;

-- 1. Add icon column to tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS icon TEXT DEFAULT NULL;

-- 2. Add icon column to gifts table  
ALTER TABLE gifts ADD COLUMN IF NOT EXISTS icon TEXT DEFAULT NULL;

-- 3. Update update_task RPC to handle icon field
CREATE OR REPLACE FUNCTION update_task(
  p_task_id UUID,
  p_title TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_xp_reward INTEGER DEFAULT NULL,
  p_money_reward NUMERIC DEFAULT NULL,
  p_frequency TEXT DEFAULT NULL,
  p_priority TEXT DEFAULT NULL,
  p_schedule_days INTEGER[] DEFAULT NULL,
  p_assigned_to UUID[] DEFAULT NULL,
  p_requires_approval BOOLEAN DEFAULT NULL,
  p_icon TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_task RECORD;
  v_caller RECORD;
BEGIN
  SELECT * INTO v_task FROM tasks WHERE id = p_task_id;
  IF v_task IS NULL THEN RAISE EXCEPTION 'Task not found'; END IF;

  SELECT id, role, family_id INTO v_caller FROM members WHERE id = get_current_member_id();
  IF v_caller IS NULL OR v_caller.family_id != v_task.family_id THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  IF v_caller.role NOT IN ('owner', 'parent') THEN
    RAISE EXCEPTION 'Only parents can edit tasks';
  END IF;

  UPDATE tasks SET
    title = COALESCE(p_title, title),
    description = COALESCE(p_description, description),
    xp_reward = COALESCE(p_xp_reward, xp_reward),
    money_reward = COALESCE(p_money_reward, money_reward),
    frequency = COALESCE(p_frequency, frequency),
    priority = COALESCE(p_priority, priority),
    schedule_days = COALESCE(p_schedule_days, schedule_days),
    assigned_to = COALESCE(p_assigned_to, assigned_to),
    requires_approval = COALESCE(p_requires_approval, requires_approval),
    icon = COALESCE(p_icon, icon)
  WHERE id = p_task_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_tasks_icon ON tasks(icon) WHERE icon IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_gifts_icon ON gifts(icon) WHERE icon IS NOT NULL;

COMMIT;
