-- ============================================================
-- Migration 046: Expand achievement engine
-- ============================================================
-- Current engine only supports: xp_total, tasks_completed, streak_days
-- Seeded requirement types: tasks_completed, quran_surah, money_earned,
--                           money_saved, streak
--
-- EXPANSION: Add support for all seeded types:
--   - tasks_completed (already supported)
--   - streak (map to current_streak, alias for streak_days)
--   - quran_surah (count distinct surahs from quran_progress)
--   - money_earned (sum of earned money transactions)
--   - money_saved (balance: earned - withdrawn - redeemed)
--
-- PRESERVE: xp_total support (even though no seed uses it)
-- ============================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.check_and_award_achievements(p_child_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_achievement RECORD;
  v_member RECORD;
  v_total_xp INTEGER;
  v_total_tasks INTEGER;
  v_streak INTEGER;
  v_quran_surahs INTEGER;
  v_money_earned NUMERIC;
  v_money_withdrawn NUMERIC;
  v_money_redeemed NUMERIC;
  v_money_saved NUMERIC;
  v_count INTEGER := 0;
BEGIN
  -- Get member info
  SELECT id, family_id, current_streak INTO v_member
  FROM members WHERE id = p_child_id AND role = 'child';
  IF v_member IS NULL THEN RETURN 0; END IF;

  -- Calculate all metrics
  SELECT COALESCE(SUM(amount), 0) INTO v_total_xp
  FROM xp_transactions WHERE member_id = p_child_id;

  SELECT COUNT(*) INTO v_total_tasks
  FROM task_completions WHERE member_id = p_child_id AND approved = TRUE;

  v_streak := COALESCE(v_member.current_streak, 0);

  -- quran_surah: count distinct surahs completed
  SELECT COUNT(DISTINCT surah) INTO v_quran_surahs
  FROM quran_progress WHERE member_id = p_child_id;

  -- money_earned: sum of earned transactions
  SELECT COALESCE(SUM(amount), 0) INTO v_money_earned
  FROM money_transactions
  WHERE member_id = p_child_id AND type = 'earned' AND status = 'approved';

  -- money_withdrawn: sum of withdrawn transactions
  SELECT COALESCE(SUM(amount), 0) INTO v_money_withdrawn
  FROM money_transactions
  WHERE member_id = p_child_id AND type = 'withdrawn' AND status = 'approved';

  -- money_redeemed: sum of redeemed transactions
  SELECT COALESCE(SUM(amount), 0) INTO v_money_redeemed
  FROM money_transactions
  WHERE member_id = p_child_id AND type = 'redeemed' AND status = 'approved';

  -- money_saved: balance = earned - withdrawn - redeemed
  v_money_saved := v_money_earned - v_money_withdrawn - v_money_redeemed;

  -- Check each unearned achievement
  FOR v_achievement IN
    SELECT ad.* FROM achievement_definitions ad
    WHERE NOT EXISTS (
      SELECT 1 FROM member_achievements ma
      WHERE ma.member_id = p_child_id AND ma.achievement_id = ad.id
    )
  LOOP
    -- Check if requirement is met
    IF (v_achievement.requirement_type = 'xp_total' AND v_total_xp >= v_achievement.requirement_value) OR
       (v_achievement.requirement_type = 'tasks_completed' AND v_total_tasks >= v_achievement.requirement_value) OR
       (v_achievement.requirement_type = 'streak' AND v_streak >= v_achievement.requirement_value) OR
       (v_achievement.requirement_type = 'streak_days' AND v_streak >= v_achievement.requirement_value) OR
       (v_achievement.requirement_type = 'quran_surah' AND v_quran_surahs >= v_achievement.requirement_value) OR
       (v_achievement.requirement_type = 'money_earned' AND v_money_earned >= v_achievement.requirement_value) OR
       (v_achievement.requirement_type = 'money_saved' AND v_money_saved >= v_achievement.requirement_value) THEN
      INSERT INTO member_achievements (member_id, achievement_id)
      VALUES (p_child_id, v_achievement.id);
      v_count := v_count + 1;
    END IF;
  END LOOP;

  RETURN v_count;
END;
$function$;

COMMIT;