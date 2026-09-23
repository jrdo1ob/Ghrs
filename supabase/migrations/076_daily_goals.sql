-- ============================================
-- Migration 076: Daily Goals for Child Engagement
-- Phase 2 backend foundation
-- ============================================

BEGIN;

-- 1. Create daily_goals table
-- Stores the daily task-completion goal configuration per child.
-- Progress is derived from task_completions (not stored redundantly).
CREATE TABLE IF NOT EXISTS daily_goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  target_tasks INTEGER NOT NULL DEFAULT 3 CHECK (target_tasks > 0 AND target_tasks <= 20),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(member_id)
);

-- Index for fast lookups by member
CREATE INDEX IF NOT EXISTS idx_daily_goals_member ON daily_goals(member_id);

-- RLS enabled for defense-in-depth, but all access goes through
-- SECURITY DEFINER RPCs with service_role, so RLS policies are not the primary guard.
ALTER TABLE daily_goals ENABLE ROW LEVEL SECURITY;

-- No explicit RLS policies added — service_role bypasses RLS,
-- and the RPC functions handle all authorization internally.

-- 2. Create RPC to get daily goal progress
-- Returns the child's daily goal target and today's completion count
CREATE OR REPLACE FUNCTION get_daily_goal(p_member_id UUID)
RETURNS TABLE(
  target_tasks INTEGER,
  completed_today BIGINT,
  goal_reached BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_target INTEGER;
  v_completed BIGINT;
  v_today DATE := CURRENT_DATE;
BEGIN
  -- Get the child's daily goal target
  SELECT COALESCE(dg.target_tasks, 3) INTO v_target
  FROM daily_goals dg
  WHERE dg.member_id = p_member_id;

  -- Default to 3 if no goal set
  IF v_target IS NULL THEN
    v_target := 3;
  END IF;

  -- Count approved task completions for today
  SELECT COUNT(*) INTO v_completed
  FROM task_completions tc
  WHERE tc.member_id = p_member_id
    AND tc.completed_at::date = v_today
    AND tc.approved = TRUE;

  RETURN QUERY SELECT v_target, v_completed, (v_completed >= v_target);
END;
$$;

-- 3. Create RPC to set/update daily goal
CREATE OR REPLACE FUNCTION set_daily_goal(
  p_member_id UUID,
  p_target_tasks INTEGER,
  p_caller_member_id UUID DEFAULT NULL
)
RETURNS TABLE(success BOOLEAN, message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID;
  v_caller_role TEXT;
  v_child_family_id UUID;
BEGIN
  -- Determine caller identity (supports both Code+PIN and OAuth)
  IF p_caller_member_id IS NOT NULL THEN
    v_caller_id := p_caller_member_id;
  ELSE
    v_caller_id := get_current_member_id();
  END IF;

  IF v_caller_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 'غير مصرح: لا يوجد مستخدم'::TEXT;
    RETURN;
  END IF;

  SELECT role, family_id INTO v_caller_role, v_child_family_id
  FROM members WHERE id = v_caller_id;

  IF v_caller_role IS NULL OR v_caller_role NOT IN ('owner', 'parent') THEN
    RETURN QUERY SELECT FALSE, 'غير مصرح: الوالدين فقط'::TEXT;
    RETURN;
  END IF;

  -- Verify target belongs to same family
  DECLARE
    v_target_family_id UUID;
  BEGIN
    SELECT family_id INTO v_target_family_id FROM members WHERE id = p_member_id;
    IF v_target_family_id IS NULL OR v_target_family_id != v_child_family_id THEN
      RETURN QUERY SELECT FALSE, 'غير مصرح: عائلة مختلفة'::TEXT;
      RETURN;
    END IF;
  END;

  -- Validate target range
  IF p_target_tasks < 1 OR p_target_tasks > 20 THEN
    RETURN QUERY SELECT FALSE, 'الهدف يجب أن يكون بين 1 و 20'::TEXT;
    RETURN;
  END IF;

  -- Upsert the daily goal
  INSERT INTO daily_goals (member_id, target_tasks, updated_at)
  VALUES (p_member_id, p_target_tasks, NOW())
  ON CONFLICT (member_id) DO UPDATE
    SET target_tasks = EXCLUDED.target_tasks, updated_at = NOW();

  RETURN QUERY SELECT TRUE, 'تم حفظ الهدف اليومي'::TEXT;
END;
$$;

-- 4. Grant execute permissions
GRANT EXECUTE ON FUNCTION get_daily_goal(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION set_daily_goal(UUID, INTEGER, UUID) TO service_role;
REVOKE EXECUTE ON FUNCTION get_daily_goal(UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION set_daily_goal(UUID, INTEGER, UUID) FROM PUBLIC, anon, authenticated;

COMMIT;
