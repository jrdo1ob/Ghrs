-- ============================================================
-- Migration 052: Fix task availability after rejection
-- ============================================================
-- BUG: is_task_available counts rejected completions (approved=FALSE)
--      as "last completion", blocking the task from being available.
--
-- FIX: Only count approved completions (approved=TRUE) for
--      availability calculation. Rejected completions should not
--      prevent the child from completing the task again.
--
-- BEHAVIOR:
--   Before: Rejected → task unavailable until next period
--   After:  Rejected → task available for re-completion
-- ============================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.is_task_available(p_task_id uuid, p_member_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
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

  -- Get last APPROVED completion date (rejected completions do not block re-completion)
  SELECT MAX(completed_at) INTO v_last_completion
  FROM task_completions
  WHERE task_id = p_task_id AND member_id = p_member_id AND approved = TRUE;

  -- If no previous approved completion, task is available
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
$function$;

COMMIT;