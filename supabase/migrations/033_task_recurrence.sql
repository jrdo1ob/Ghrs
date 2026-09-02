-- Migration 033: Task Recurrence System
-- Adds recurrence tracking and timezone support

BEGIN;

-- 1. Add recurrence tracking to tasks
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS last_completed_at TIMESTAMPTZ;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS recurrence_reset_at TIMESTAMPTZ;

-- 2. Add timezone support to families
ALTER TABLE families ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'Asia/Bahrain';

-- 3. Create function to check if task is available for completion
CREATE OR REPLACE FUNCTION is_task_available(p_task_id UUID, p_member_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_task RECORD;
  v_last_completion TIMESTAMPTZ;
  v_today DATE;
  v_day_of_week INTEGER;
  v_day_of_month INTEGER;
  v_month INTEGER;
  v_last_month INTEGER;
BEGIN
  SELECT * INTO v_task FROM tasks WHERE id = p_task_id AND is_active = true AND is_deleted = false;
  
  IF v_task IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Check if task is assigned to this child
  IF v_task.assigned_to IS NOT NULL AND NOT (p_member_id = ANY(v_task.assigned_to)) THEN
    RETURN FALSE;
  END IF;

  -- Get last completion date
  SELECT MAX(completed_at) INTO v_last_completion
  FROM task_completions
  WHERE task_id = p_task_id AND member_id = p_member_id AND approved IS NOT NULL;

  -- If no previous completion, task is available
  IF v_last_completion IS NULL THEN
    RETURN TRUE;
  END IF;

  v_today := CURRENT_DATE;
  v_day_of_week := EXTRACT(DOW FROM v_today);
  v_day_of_month := EXTRACT(DAY FROM v_today);
  v_month := EXTRACT(MONTH FROM v_today);
  v_last_month := EXTRACT(MONTH FROM v_last_completion::date);

  -- Check recurrence type
  CASE v_task.frequency
    WHEN 'daily' THEN
      -- Available if last completion was before today
      RETURN v_last_completion::date < v_today;
    
    WHEN 'weekly' THEN
      -- Available if last completion was in a previous week
      RETURN v_last_completion::date < v_today - INTERVAL '7 days';
    
    WHEN 'monthly' THEN
      -- Available if last completion was in a previous month
      RETURN v_last_month < v_month OR (v_month = 1 AND v_last_month = 12);
    
    WHEN 'once' THEN
      -- Never available again after first completion
      RETURN FALSE;
    
    WHEN 'custom' THEN
      -- Check if today matches any of the scheduled days
      IF v_task.schedule_days IS NOT NULL AND v_day_of_week = ANY(v_task.schedule_days) THEN
        RETURN v_last_completion::date < v_today;
      END IF;
      RETURN FALSE;
    
    ELSE
      -- Unknown frequency, treat as available
      RETURN TRUE;
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create function to get available tasks for a child
CREATE OR REPLACE FUNCTION get_available_tasks(p_family_id UUID, p_member_id UUID)
RETURNS TABLE(
  task_id UUID,
  title TEXT,
  description TEXT,
  xp_reward INTEGER,
  money_reward NUMERIC,
  requires_approval BOOLEAN,
  frequency TEXT,
  priority TEXT,
  icon TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT t.id, t.title, t.description, t.xp_reward, t.money_reward,
         t.requires_approval, t.frequency, t.priority, t.icon
  FROM tasks t
  WHERE t.family_id = p_family_id
    AND t.is_active = true
    AND t.is_deleted = false
    AND t.is_paused = false
    AND is_task_available(t.id, p_member_id) = true
  ORDER BY 
    CASE t.priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END,
    t.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
