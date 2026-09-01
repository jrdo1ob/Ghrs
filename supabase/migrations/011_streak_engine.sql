-- Migration 011: Server-Side Streak Engine + Grace Shield
-- Computes streak from task_completions (100% completion required)
-- Grace shields protect streak, reset weekly

BEGIN;

-- ============================================================
-- 1. RPC: Update member streak (called after task approval/completion)
-- ============================================================

CREATE OR REPLACE FUNCTION update_member_streak(p_member_id UUID)
RETURNS TABLE(
  current_streak INTEGER,
  longest_streak INTEGER,
  grace_shields INTEGER,
  last_active_date DATE
) AS $$
DECLARE
  v_member RECORD;
  v_today DATE := CURRENT_DATE;
  v_yesterday DATE := CURRENT_DATE - INTERVAL '1 day';
  v_total_tasks INTEGER;
  v_completed_today INTEGER;
  v_completed_yesterday INTEGER;
  v_new_streak INTEGER;
  v_new_longest INTEGER;
  v_new_shields INTEGER;
  v_new_last_active DATE;
BEGIN
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

  -- Count completed (approved) tasks today
  SELECT COUNT(*) INTO v_completed_today
  FROM task_completions tc
  WHERE tc.member_id = p_member_id
    AND tc.approved = TRUE
    AND tc.completed_at::date = v_today;

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

  -- Check if today is complete (100%)
  IF v_completed_today >= v_total_tasks THEN
    -- Today is complete
    IF v_member.last_active_date = v_yesterday OR v_member.last_active_date = v_today THEN
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
    v_new_last_active := v_today;

  ELSIF v_completed_yesterday >= v_total_tasks AND v_member.last_active_date = v_yesterday THEN
    -- Yesterday was complete but today is not yet - streak continues
    IF v_member.grace_shields > 0 AND v_completed_today < v_total_tasks THEN
      -- Use a shield for today if it's already past and incomplete
      -- Only consume shield if the day is fully passed (we check this via a threshold)
      -- For now, don't consume - the shield is consumed when streak would break
      NULL;
    END IF;
    RETURN QUERY SELECT v_member.current_streak, v_member.longest_streak, v_member.grace_shields, v_member.last_active_date;
    RETURN;

  ELSE
    -- Today incomplete and yesterday wasn't complete either
    -- Check if yesterday was the last active day and we need a shield
    IF v_member.last_active_date = v_yesterday AND v_member.grace_shields > 0 THEN
      -- Use grace shield to protect streak
      v_new_shields := v_member.grace_shields - 1;
      v_new_streak := v_member.current_streak + 1;
      v_new_last_active := v_today;
    ELSIF v_member.last_active_date = v_today THEN
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 2. RPC: Weekly grace shield reset (run via pg_cron or manual)
-- ============================================================

CREATE OR REPLACE FUNCTION reset_weekly_grace_shields()
RETURNS void AS $$
BEGIN
  UPDATE members
  SET grace_shields = 3
  WHERE role = 'child'
    AND is_deleted = FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 3. Trigger: Auto-update streak after task approval
-- ============================================================

CREATE OR REPLACE FUNCTION trigger_update_streak()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.approved = TRUE AND (OLD.approved IS NULL OR OLD.approved = FALSE) THEN
    PERFORM update_member_streak(NEW.member_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_streak_on_approval ON task_completions;
CREATE TRIGGER trg_update_streak_on_approval
  AFTER UPDATE ON task_completions
  FOR EACH ROW EXECUTE FUNCTION trigger_update_streak();

-- Also trigger on insert for auto-approved tasks
CREATE OR REPLACE FUNCTION trigger_update_streak_insert()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.approved = TRUE THEN
    PERFORM update_member_streak(NEW.member_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_streak_on_insert ON task_completions;
CREATE TRIGGER trg_update_streak_on_insert
  AFTER INSERT ON task_completions
  FOR EACH ROW EXECUTE FUNCTION trigger_update_streak_insert();

COMMIT;
