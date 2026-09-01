-- Migration 022: Auto-update Streak & Achievements + Ledger page support
-- Creates RPCs for streak calculation and achievement checking

BEGIN;

-- 1. RPC: Update child's streak based on task completions
CREATE OR REPLACE FUNCTION update_child_streak(p_child_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_current_streak INTEGER := 0;
  v_check_date DATE;
  v_has_completions BOOLEAN;
  v_member RECORD;
BEGIN
  SELECT id, family_id INTO v_member FROM members WHERE id = p_child_id AND role = 'child';
  IF v_member IS NULL THEN RETURN 0; END IF;

  v_check_date := CURRENT_DATE;
  LOOP
    SELECT EXISTS(
      SELECT 1 FROM task_completions tc
      JOIN tasks t ON tc.task_id = t.id
      WHERE tc.member_id = p_child_id
      AND tc.approved = TRUE
      AND tc.completed_at::date = v_check_date
      AND t.family_id = v_member.family_id
    ) INTO v_has_completions;

    IF NOT v_has_completions THEN
      EXIT;
    END IF;

    v_current_streak := v_current_streak + 1;
    v_check_date := v_check_date - INTERVAL '1 day';
  END LOOP;

  UPDATE members SET current_streak = v_current_streak WHERE id = p_child_id;
  RETURN v_current_streak;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. RPC: Check and award achievements for a child
CREATE OR REPLACE FUNCTION check_and_award_achievements(p_child_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_achievement RECORD;
  v_member RECORD;
  v_total_xp INTEGER;
  v_total_tasks INTEGER;
  v_streak INTEGER;
  v_count INTEGER := 0;
BEGIN
  SELECT id, family_id, current_streak INTO v_member FROM members WHERE id = p_child_id AND role = 'child';
  IF v_member IS NULL THEN RETURN 0; END IF;

  SELECT COALESCE(SUM(amount), 0) INTO v_total_xp FROM xp_transactions WHERE member_id = p_child_id;
  SELECT COUNT(*) INTO v_total_tasks FROM task_completions WHERE member_id = p_child_id AND approved = TRUE;
  v_streak := COALESCE(v_member.current_streak, 0);

  FOR v_achievement IN
    SELECT ad.* FROM achievement_definitions ad
    WHERE NOT EXISTS (
      SELECT 1 FROM member_achievements ma
      WHERE ma.member_id = p_child_id AND ma.achievement_id = ad.id
    )
  LOOP
    IF (v_achievement.requirement_type = 'xp_total' AND v_total_xp >= v_achievement.requirement_value) OR
       (v_achievement.requirement_type = 'tasks_completed' AND v_total_tasks >= v_achievement.requirement_value) OR
       (v_achievement.requirement_type = 'streak_days' AND v_streak >= v_achievement.requirement_value) THEN
      INSERT INTO member_achievements (member_id, achievement_id) VALUES (p_child_id, v_achievement.id);
      v_count := v_count + 1;
    END IF;
  END LOOP;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. RPC: Get child's full balance
CREATE OR REPLACE FUNCTION get_child_full_balance(p_child_id UUID)
RETURNS TABLE(
  xp_balance INTEGER,
  money_balance NUMERIC,
  total_tasks INTEGER,
  current_streak INTEGER
) AS $$
DECLARE
  v_member RECORD;
BEGIN
  SELECT id, current_streak INTO v_member FROM members WHERE id = p_child_id;
  
  RETURN QUERY
  SELECT
    COALESCE((SELECT SUM(amount) FROM xp_transactions WHERE member_id = p_child_id), 0)::INTEGER,
    COALESCE((SELECT SUM(CASE WHEN type = 'earned' THEN amount ELSE -amount END)
              FROM money_transactions WHERE member_id = p_child_id AND status = 'approved'), 0),
    COALESCE((SELECT COUNT(*) FROM task_completions WHERE member_id = p_child_id AND approved = TRUE), 0)::INTEGER,
    COALESCE(v_member.current_streak, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Add ledger route to navigation (done in code)

COMMIT;
