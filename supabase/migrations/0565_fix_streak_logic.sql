-- ============================================================
-- Migration 056: Fix streak evaluation date + historical recalculation
-- ============================================================
-- BUG: update_member_streak uses CURRENT_DATE (approval day) instead
--      of the original completion day. When approval occurs on a
--      different day, streak logic evaluates the wrong day.
--
-- FIX: Add optional p_completion_date parameter to update_member_streak.
--      When provided, use it for streak evaluation instead of CURRENT_DATE.
--      Update triggers to pass NEW.completed_at::date.
--
-- HISTORICAL: Recalculate all member streaks from historical data.
-- ============================================================

BEGIN;

-- ============================================================
-- 1. Replace update_member_streak with completion-date-aware version
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_member_streak(
  p_member_id UUID,
  p_completion_date DATE DEFAULT NULL
)
RETURNS TABLE(
  current_streak INTEGER,
  longest_streak INTEGER,
  grace_shields INTEGER,
  last_active_date DATE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_member RECORD;
  v_effective_date DATE;
  v_yesterday DATE;
  v_total_tasks INTEGER;
  v_completed_today INTEGER;
  v_completed_yesterday INTEGER;
  v_new_streak INTEGER;
  v_new_longest INTEGER;
  v_new_shields INTEGER;
  v_new_last_active DATE;
BEGIN
  -- Use provided completion date or fall back to CURRENT_DATE
  v_effective_date := COALESCE(p_completion_date, CURRENT_DATE);
  v_yesterday := v_effective_date - INTERVAL '1 day';

  -- Get member info
  SELECT * INTO v_member FROM members WHERE id = p_member_id;

  IF v_member IS NULL THEN
    RAISE EXCEPTION 'Member not found';
  END IF;

  -- Count total active tasks for this child's family
  SELECT COUNT(*) INTO v_total_tasks
  FROM tasks
  WHERE family_id = v_member.family_id
    AND is_active = TRUE
    AND is_deleted = FALSE;

  -- Count completed (approved) tasks on effective date
  SELECT COUNT(*) INTO v_completed_today
  FROM task_completions tc
  WHERE tc.member_id = p_member_id
    AND tc.approved = TRUE
    AND tc.completed_at::date = v_effective_date;

  -- Count completed yesterday
  SELECT COUNT(*) INTO v_completed_yesterday
  FROM task_completions tc
  WHERE tc.member_id = p_member_id
    AND tc.approved = TRUE
    AND tc.completed_at::date = v_yesterday;

  -- Determine new streak
  v_new_streak := v_member.current_streak;
  v_new_shields := v_member.grace_shields;
  v_new_last_active := v_member.last_active_date;

  IF v_total_tasks = 0 THEN
    -- No tasks assigned, streak unchanged
    RETURN QUERY SELECT v_member.current_streak, v_member.longest_streak, v_member.grace_shields, v_member.last_active_date;
    RETURN;
  END IF;

  -- Check if effective date is complete (100%)
  IF v_completed_today >= v_total_tasks THEN
    -- Effective date is complete
    IF v_member.last_active_date = v_yesterday OR v_member.last_active_date = v_effective_date THEN
      -- Continuing or starting streak
      IF v_member.last_active_date = v_yesterday THEN
        v_new_streak := v_member.current_streak + 1;
      ELSE
        v_new_streak := v_member.current_streak;
      END IF;
    ELSE
      -- Gap > 1 day - check grace shield
      IF v_member.grace_shields > 0 THEN
        v_new_shields := v_member.grace_shields - 1;
        v_new_streak := v_member.current_streak + 1;
      ELSE
        -- No shields - start fresh
        v_new_streak := 1;
      END IF;
    END IF;
    v_new_last_active := v_effective_date;

  ELSIF v_completed_yesterday >= v_total_tasks AND v_member.last_active_date = v_yesterday THEN
    -- Yesterday was complete but effective date is not yet - streak continues
    IF v_member.grace_shields > 0 AND v_completed_today < v_total_tasks THEN
      NULL;
    END IF;
    RETURN QUERY SELECT v_member.current_streak, v_member.longest_streak, v_member.grace_shields, v_member.last_active_date;
    RETURN;

  ELSE
    -- Effective date incomplete and yesterday wasn't complete either
    IF v_member.last_active_date = v_yesterday AND v_member.grace_shields > 0 THEN
      -- Use grace shield to protect streak
      v_new_shields := v_member.grace_shields - 1;
      v_new_streak := v_member.current_streak + 1;
      v_new_last_active := v_effective_date;
    ELSIF v_member.last_active_date = v_effective_date THEN
      -- Already counted today
      RETURN QUERY SELECT v_member.current_streak, v_member.longest_streak, v_member.grace_shields, v_member.last_active_date;
      RETURN;
    ELSE
      -- Streak broken - reset
      v_new_streak := 0;
      v_new_last_active := v_member.last_active_date;
    END IF;
  END IF;

  -- Update longest streak
  v_new_longest := GREATEST(v_new_streak, v_member.longest_streak);

  -- Persist to database
  UPDATE members
  SET current_streak = v_new_streak,
      longest_streak = v_new_longest,
      grace_shields = v_new_shields,
      last_active_date = v_new_last_active
  WHERE id = p_member_id;

  RETURN QUERY SELECT v_new_streak, v_new_longest, v_new_shields, v_new_last_active;
END;
$function$;

-- ============================================================
-- 2. Update triggers to pass completion date
-- ============================================================

-- Approval trigger: pass NEW.completed_at::date
CREATE OR REPLACE FUNCTION public.trigger_update_streak()
RETURNS TRIGGER AS $function$
BEGIN
  IF NEW.approved = TRUE AND (OLD.approved IS NULL OR OLD.approved = FALSE) THEN
    PERFORM update_member_streak(NEW.member_id, NEW.completed_at::date);
  END IF;
  RETURN NEW;
END;
$function$ LANGUAGE plpgsql;

-- Insert trigger: pass NEW.completed_at::date
CREATE OR REPLACE FUNCTION public.trigger_update_streak_insert()
RETURNS TRIGGER AS $function$
BEGIN
  IF NEW.approved = TRUE THEN
    PERFORM update_member_streak(NEW.member_id, NEW.completed_at::date);
  END IF;
  RETURN NEW;
END;
$function$ LANGUAGE plpgsql;

-- ============================================================
-- 3. Historical recalculation
-- ============================================================
-- Recalculate streak for all children from historical completion data.
-- Uses the EXISTING algorithm with effective_date = completion date.

DO LANGUAGE plpgsql $$
DECLARE
  child_record RECORD;
  completion_record RECORD;
  family_task_count INTEGER;
  completed_on_date INTEGER;
  streak INTEGER;
  longest_streak INTEGER;
  last_active DATE;
  effective_date DATE;
  prev_date DATE;
  v_total_tasks INTEGER;
BEGIN
  FOR child_record IN
    SELECT id, family_id FROM members WHERE role = 'child' AND is_deleted = FALSE
  LOOP
    -- Get total active tasks for this child's family
    SELECT COUNT(*) INTO v_total_tasks
    FROM tasks
    WHERE family_id = child_record.family_id
      AND is_active = TRUE
      AND is_deleted = FALSE;

    -- Skip if no tasks
    IF v_total_tasks = 0 THEN
      UPDATE members SET current_streak = 0, longest_streak = 0, last_active_date = NULL
      WHERE id = child_record.id;
      CONTINUE;
    END IF;

    -- Get all approved completions sorted by date
    streak := 0;
    longest_streak := 0;
    last_active := NULL;
    prev_date := NULL;

    FOR completion_record IN
      SELECT completed_at::date as comp_date
      FROM task_completions
      WHERE member_id = child_record.id AND approved = TRUE
      GROUP BY completed_at::date
      ORDER BY completed_at::date
    LOOP
      effective_date := completion_record.comp_date;

      -- Count completions on this date
      SELECT COUNT(*) INTO completed_on_date
      FROM task_completions
      WHERE member_id = child_record.id
        AND approved = TRUE
        AND completed_at::date = effective_date;

      -- Check if 100% complete
      IF completed_on_date >= v_total_tasks THEN
        -- Streak day
        IF prev_date IS NULL OR prev_date = effective_date - INTERVAL '1 day' THEN
          streak := streak + 1;
        ELSIF prev_date = effective_date THEN
          -- Same day, don't double count
          NULL;
        ELSE
          -- Gap - reset streak
          streak := 1;
        END IF;
        last_active := effective_date;
        prev_date := effective_date;
      END IF;
    END LOOP;

    -- Update member
    longest_streak := GREATEST(streak, 0);
    UPDATE members
    SET current_streak = streak,
        longest_streak = longest_streak,
        last_active_date = last_active
    WHERE id = child_record.id;

    RAISE NOTICE 'Child %: streak=%, longest=%, last_active=%',
      child_record.id, streak, longest_streak, last_active;
  END LOOP;
END $$;

COMMIT;