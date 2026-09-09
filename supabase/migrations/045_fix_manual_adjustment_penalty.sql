-- ============================================================
-- Migration 045: Fix apply_manual_adjustment money penalty bug
-- ============================================================
-- The function attempted to INSERT type='penalty' which violates
-- the money_transactions.type CHECK constraint.
-- FIX: Use 'withdrawn' instead of 'penalty' for money deductions.
-- This preserves the existing ledger contract where:
--   earned = money added
--   withdrawn = money deducted
-- ============================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.apply_manual_adjustment(
  p_child_id uuid,
  p_type text,
  p_currency_type text,
  p_amount integer,
  p_reason text
)
RETURNS TABLE(success boolean, message text, new_xp integer, new_money numeric)
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
BEGIN
  -- Authorization check
  SELECT id, role, family_id INTO v_caller FROM members WHERE id = get_current_member_id();
  IF v_caller IS NULL THEN
    RETURN QUERY SELECT FALSE, 'غير مصرح: لا يوجد مستخدم', 0, 0::NUMERIC;
    RETURN;
  END IF;
  IF v_caller.role NOT IN ('owner', 'parent') THEN
    RETURN QUERY SELECT FALSE, 'غير مصرح: الوالدين فقط', 0, 0::NUMERIC;
    RETURN;
  END IF;

  -- Child validation
  SELECT id, family_id, name INTO v_child FROM members WHERE id = p_child_id AND role = 'child';
  IF v_child IS NULL THEN
    RETURN QUERY SELECT FALSE, 'الطفل غير موجود', 0, 0::NUMERIC;
    RETURN;
  END IF;
  IF v_child.family_id != v_caller.family_id THEN
    RETURN QUERY SELECT FALSE, 'غير مصرح: طفل من عائلة أخرى', 0, 0::NUMERIC;
    RETURN;
  END IF;

  -- Validate type
  IF p_type NOT IN ('reward', 'penalty') THEN
    RETURN QUERY SELECT FALSE, 'نوع العملية غير صحيح', 0, 0::NUMERIC;
    RETURN;
  END IF;

  -- Validate currency type
  IF p_currency_type NOT IN ('xp', 'money') THEN
    RETURN QUERY SELECT FALSE, 'نوع العملة غير صحيح', 0, 0::NUMERIC;
    RETURN;
  END IF;

  -- Validate amount
  IF p_amount <= 0 THEN
    RETURN QUERY SELECT FALSE, 'المبلغ يجب أن يكون أكبر من صفر', 0, 0::NUMERIC;
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
    -- Check for negative balance
    IF p_currency_type = 'xp' THEN
      IF v_new_xp < p_amount THEN
        v_xp_amount := v_new_xp;
      ELSE
        v_xp_amount := p_amount;
      END IF;
      v_money_amount := 0;
    ELSE
      IF v_new_money < p_amount THEN
        v_money_amount := v_new_xp;
      ELSE
        v_money_amount := p_amount;
      END IF;
      v_xp_amount := 0;
    END IF;
  END IF;

  -- Insert XP transaction
  IF v_xp_amount > 0 THEN
    INSERT INTO xp_transactions (member_id, amount, source, source_id, description)
    VALUES (p_child_id, v_xp_amount, 'manual', v_caller.id,
            CASE WHEN p_type = 'reward' THEN '+' ELSE '-' END || ' ' || p_reason);
  ELSIF v_xp_amount < 0 THEN
    INSERT INTO xp_transactions (member_id, amount, source, source_id, description)
    VALUES (p_child_id, v_xp_amount, 'manual', v_caller.id,
            CASE WHEN p_type = 'reward' THEN '+' ELSE '-' END || ' ' || p_reason);
  END IF;

  -- Insert money transaction
  IF v_money_amount > 0 THEN
    INSERT INTO money_transactions (member_id, amount, type, source, source_id, status, description)
    VALUES (p_child_id, v_money_amount,
            CASE WHEN p_type = 'reward' THEN 'earned' ELSE 'withdrawn' END,
            'manual', v_caller.id, 'approved',
            CASE WHEN p_type = 'reward' THEN '+' ELSE '-' END || ' ' || p_reason);
  ELSIF v_money_amount < 0 THEN
    INSERT INTO money_transactions (member_id, amount, type, source, source_id, status, description)
    VALUES (p_child_id, ABS(v_money_amount), 'withdrawn',
            'manual', v_caller.id, 'approved',
            '-' || p_reason);
  END IF;

  -- Recalculate balances
  SELECT COALESCE(SUM(amount), 0) INTO v_new_xp FROM xp_transactions WHERE member_id = p_child_id;
  SELECT COALESCE(SUM(CASE WHEN type = 'earned' THEN amount ELSE -amount END), 0) INTO v_new_money
  FROM money_transactions WHERE member_id = p_child_id AND status = 'approved';

  RETURN QUERY SELECT TRUE,
    CASE WHEN p_type = 'reward' THEN 'تم منح المكافأة' ELSE 'تم تطبيق الخصم' END,
    v_new_xp, v_new_money;
END;
$function$;

COMMIT;