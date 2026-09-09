-- ============================================================
-- Migration 051: Fix XP penalty sign and add applied amounts
-- ============================================================
-- BUG: XP penalty inserts positive amount, increasing balance.
-- FIX: XP penalty must insert negative amount.
--
-- NEW: Return explicit xp_applied and money_applied values
--      so the UI can display the actual deducted amount.
--
-- SEMANTICS:
--   Reward 10 XP → xp_applied = +10
--   Penalty 60 XP → xp_applied = -60
--   Penalty 200 when balance 100 → xp_applied = -100
--   Penalty when balance 0 → xp_applied = 0
--
-- OVERLOADS: Updates the 6-arg version (with p_caller_member_id).
--            The 5-arg version is not called by any code and is
--            left unchanged for backward compatibility.
--
-- NOTE: Must DROP the 6-arg version first because PostgreSQL
--       does not allow changing return type with CREATE OR REPLACE.
-- ============================================================

BEGIN;

-- Drop the 6-arg version (the only one called by the API)
DROP FUNCTION IF EXISTS public.apply_manual_adjustment(
  uuid, text, text, integer, text, uuid
);

-- Recreate with new return type
CREATE OR REPLACE FUNCTION public.apply_manual_adjustment(
  p_child_id uuid,
  p_type text,
  p_currency_type text,
  p_amount integer,
  p_reason text,
  p_caller_member_id uuid DEFAULT NULL
)
RETURNS TABLE(
  success boolean,
  message text,
  new_xp integer,
  new_money numeric,
  xp_applied integer,
  money_applied numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_caller RECORD;
  v_child RECORD;
  v_new_xp INTEGER;
  v_new_money NUMERIC;
  v_xp_amount INTEGER;
  v_money_amount NUMERIC;
  v_effective_caller_id UUID;
BEGIN
  -- Determine caller identity
  IF p_caller_member_id IS NOT NULL THEN
    v_effective_caller_id := p_caller_member_id;
  ELSE
    v_effective_caller_id := get_current_member_id();
  END IF;

  -- Authorization check
  SELECT id, role, family_id INTO v_caller FROM members WHERE id = v_effective_caller_id;
  IF v_caller IS NULL THEN
    RETURN QUERY SELECT FALSE, 'غير مصرح: لا يوجد مستخدم', 0, 0::NUMERIC, 0, 0::NUMERIC;
    RETURN;
  END IF;
  IF v_caller.role NOT IN ('owner', 'parent') THEN
    RETURN QUERY SELECT FALSE, 'غير مصرح: الوالدين فقط', 0, 0::NUMERIC, 0, 0::NUMERIC;
    RETURN;
  END IF;

  -- Child validation
  SELECT id, family_id, name INTO v_child FROM members WHERE id = p_child_id AND role = 'child';
  IF v_child IS NULL THEN
    RETURN QUERY SELECT FALSE, 'الطفل غير موجود', 0, 0::NUMERIC, 0, 0::NUMERIC;
    RETURN;
  END IF;
  IF v_child.family_id != v_caller.family_id THEN
    RETURN QUERY SELECT FALSE, 'غير مصرح: طفل من عائلة أخرى', 0, 0::NUMERIC, 0, 0::NUMERIC;
    RETURN;
  END IF;

  -- Validate type
  IF p_type NOT IN ('reward', 'penalty') THEN
    RETURN QUERY SELECT FALSE, 'نوع العملية غير صحيح', 0, 0::NUMERIC, 0, 0::NUMERIC;
    RETURN;
  END IF;

  -- Validate currency type
  IF p_currency_type NOT IN ('xp', 'money') THEN
    RETURN QUERY SELECT FALSE, 'نوع العملة غير صحيح', 0, 0::NUMERIC, 0, 0::NUMERIC;
    RETURN;
  END IF;

  -- Validate amount
  IF p_amount <= 0 THEN
    RETURN QUERY SELECT FALSE, 'المبلغ يجب أن يكون أكبر من صفر', 0, 0::NUMERIC, 0, 0::NUMERIC;
    RETURN;
  END IF;

  -- Get current balances
  SELECT COALESCE(SUM(amount), 0) INTO v_new_xp FROM xp_transactions WHERE member_id = p_child_id;
  SELECT COALESCE(SUM(CASE WHEN type = 'earned' THEN amount ELSE -amount END), 0) INTO v_new_money
  FROM money_transactions WHERE member_id = p_child_id AND status = 'approved';

  -- Calculate amounts based on type
  IF p_type = 'reward' THEN
    v_xp_amount := CASE WHEN p_currency_type = 'xp' THEN p_amount ELSE 0 END;
    v_money_amount := CASE WHEN p_currency_type = 'money' THEN p_amount ELSE 0 END;
  ELSE -- penalty
    -- XP penalty: cap at available balance
    IF p_currency_type = 'xp' THEN
      IF v_new_xp <= 0 THEN
        v_xp_amount := 0;
      ELSIF v_new_xp < p_amount THEN
        v_xp_amount := v_new_xp;
      ELSE
        v_xp_amount := p_amount;
      END IF;
      v_money_amount := 0;
    ELSE
      -- Money penalty: cap at available balance
      IF v_new_money <= 0 THEN
        v_money_amount := 0;
      ELSIF v_new_money < p_amount THEN
        v_money_amount := v_new_money;
      ELSE
        v_money_amount := p_amount;
      END IF;
      v_xp_amount := 0;
    END IF;
  END IF;

  -- Insert XP transaction
  -- Reward = positive amount, Penalty = negative amount
  IF v_xp_amount > 0 THEN
    INSERT INTO xp_transactions (member_id, amount, source, source_id, description)
    VALUES (p_child_id,
            CASE WHEN p_type = 'reward' THEN v_xp_amount ELSE -v_xp_amount END,
            'manual', v_caller.id,
            CASE WHEN p_type = 'reward' THEN '+' ELSE '-' END || ' ' || p_reason);
  END IF;

  -- Insert money transaction
  IF v_money_amount > 0 THEN
    INSERT INTO money_transactions (member_id, amount, type, source, source_id, status, description)
    VALUES (p_child_id, v_money_amount,
            CASE WHEN p_type = 'reward' THEN 'earned' ELSE 'withdrawn' END,
            'manual', v_caller.id, 'approved',
            CASE WHEN p_type = 'reward' THEN '+' ELSE '-' END || ' ' || p_reason);
  END IF;

  -- Recalculate balances
  SELECT COALESCE(SUM(amount), 0) INTO v_new_xp FROM xp_transactions WHERE member_id = p_child_id;
  SELECT COALESCE(SUM(CASE WHEN type = 'earned' THEN amount ELSE -amount END), 0) INTO v_new_money
  FROM money_transactions WHERE member_id = p_child_id AND status = 'approved';

  RETURN QUERY SELECT TRUE,
    CASE WHEN p_type = 'reward' THEN 'تم منح المكافأة' ELSE 'تم تطبيق الخصم' END,
    v_new_xp, v_new_money,
    CASE WHEN p_type = 'reward' THEN v_xp_amount ELSE -v_xp_amount END,
    v_money_amount;
END;
$function$;

COMMIT;