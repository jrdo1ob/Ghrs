-- ============================================================
-- Migration 057: Fix gift approval money deduction + child status
-- ============================================================
-- FIX 1: approve_gift_redemption now deducts money when cost_money > 0
-- FIX 2: approve_gift_redemption returns xp_applied and money_applied
-- ============================================================

BEGIN;

-- Must DROP to change return type
DROP FUNCTION IF EXISTS public.approve_gift_redemption(uuid, uuid);

CREATE OR REPLACE FUNCTION public.approve_gift_redemption(
  p_redemption_id uuid,
  p_caller_member_id uuid DEFAULT NULL
)
RETURNS TABLE(success boolean, message text, xp_applied integer, money_applied numeric)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_effective_caller_id UUID;
  v_redemption RECORD;
  v_gift RECORD;
  v_member RECORD;
  v_caller_role TEXT;
  v_caller_family_id UUID;
  v_current_xp NUMERIC;
  v_current_money NUMERIC;
  v_xp_deducted INTEGER;
  v_money_deducted NUMERIC;
BEGIN
  -- Determine caller identity
  IF p_caller_member_id IS NOT NULL THEN
    v_effective_caller_id := p_caller_member_id;
  ELSE
    v_effective_caller_id := get_current_member_id();
  END IF;

  -- Get redemption details
  SELECT * INTO v_redemption FROM gift_redemptions WHERE id = p_redemption_id;

  IF v_redemption IS NULL THEN
    RETURN QUERY SELECT FALSE, 'طلب الهدية غير موجود'::TEXT, 0, 0::NUMERIC;
    RETURN;
  END IF;

  -- Check if already processed
  IF v_redemption.status != 'pending' THEN
    RETURN QUERY SELECT FALSE, 'تم معالجة هذا الطلب بالفعل'::TEXT, 0, 0::NUMERIC;
    RETURN;
  END IF;

  -- Get gift details
  SELECT * INTO v_gift FROM gifts WHERE id = v_redemption.gift_id;

  IF v_gift IS NULL THEN
    RETURN QUERY SELECT FALSE, 'الهدية غير موجودة'::TEXT, 0, 0::NUMERIC;
    RETURN;
  END IF;

  -- Get member details
  SELECT * INTO v_member FROM members WHERE id = v_redemption.member_id;

  IF v_member IS NULL THEN
    RETURN QUERY SELECT FALSE, 'العضو غير موجود'::TEXT, 0, 0::NUMERIC;
    RETURN;
  END IF;

  -- Check authorization (parent must be same family)
  IF v_effective_caller_id IS NOT NULL THEN
    SELECT role, family_id INTO v_caller_role, v_caller_family_id
    FROM members WHERE id = v_effective_caller_id;

    IF v_caller_family_id != v_gift.family_id OR v_caller_family_id != v_member.family_id THEN
      RETURN QUERY SELECT FALSE, 'غير مصرح: عائلة مختلفة'::TEXT, 0, 0::NUMERIC;
      RETURN;
    END IF;

    IF v_caller_role NOT IN ('owner', 'parent') THEN
      RETURN QUERY SELECT FALSE, 'غير مصرح: الوالدين فقط'::TEXT, 0, 0::NUMERIC;
      RETURN;
    END IF;
  END IF;

  -- Initialize applied amounts
  v_xp_deducted := 0;
  v_money_deducted := 0;

  -- XP deduction (if gift has XP cost)
  IF v_gift.cost_xp IS NOT NULL AND v_gift.cost_xp > 0 THEN
    -- Re-check XP balance
    SELECT COALESCE(SUM(amount), 0) INTO v_current_xp
    FROM xp_transactions WHERE member_id = v_redemption.member_id;

    IF v_current_xp < v_gift.cost_xp THEN
      RETURN QUERY SELECT FALSE, 'النقاط غير كافية للموافقة'::TEXT, 0, 0::NUMERIC;
      RETURN;
    END IF;

    -- Deduct XP
    INSERT INTO xp_transactions (member_id, amount, source, source_id, description)
    VALUES (v_redemption.member_id, -v_gift.cost_xp, 'gift_redemption', v_redemption.gift_id,
            'Redeemed: ' || v_gift.title);

    v_xp_deducted := v_gift.cost_xp;
  END IF;

  -- Money deduction (if gift has money cost)
  IF v_gift.cost_money IS NOT NULL AND v_gift.cost_money > 0 THEN
    -- Re-check money balance
    SELECT COALESCE(SUM(CASE WHEN type = 'earned' THEN amount ELSE -amount END), 0)
    INTO v_current_money
    FROM money_transactions WHERE member_id = v_redemption.member_id AND status = 'approved';

    IF v_current_money < v_gift.cost_money THEN
      RETURN QUERY SELECT FALSE, 'الرصيد المالي غير كافية للموافقة'::TEXT, 0, 0::NUMERIC;
      RETURN;
    END IF;

    -- Deduct money
    INSERT INTO money_transactions (member_id, amount, type, source, source_id, status, description)
    VALUES (v_redemption.member_id, v_gift.cost_money, 'withdrawn', 'gift_redemption', v_redemption.gift_id, 'approved',
            'Redeemed: ' || v_gift.title);

    v_money_deducted := v_gift.cost_money;
  END IF;

  -- Update redemption record
  UPDATE gift_redemptions
  SET status = 'approved',
      xp_spent = v_xp_deducted,
      approved_by = v_effective_caller_id,
      approved_at = NOW()
  WHERE id = p_redemption_id;

  RETURN QUERY SELECT TRUE, 'تمت الموافقة على الهدية'::TEXT, v_xp_deducted, v_money_deducted;
END;
$function$;

COMMIT;