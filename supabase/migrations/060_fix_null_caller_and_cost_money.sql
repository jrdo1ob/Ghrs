-- ============================================================
-- Migration 060: Fix NULL/forged caller auth + cost_money NUMERIC
-- ============================================================
-- FIXES:
-- 1. All 4 gift RPCs: reject NULL caller identity explicitly
-- 2. All 4 gift RPCs: reject forged/non-existent member explicitly
-- 3. gifts.cost_money: INTEGER → NUMERIC(10,3) for fractional BHD
-- ============================================================

BEGIN;

-- 1. Fix gifts.cost_money type
ALTER TABLE gifts ALTER COLUMN cost_money TYPE NUMERIC(10,3);

-- Existing integer values (0, 1, 2, 3...) are safely promoted to NUMERIC(10,3).
-- No data loss. No truncation. Fractional values like 0.500 are now supported.

-- 2. Fix approve_gift_redemption — NULL/forged caller rejection
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

  -- REJECT NULL caller (explicit authorization gate)
  IF v_effective_caller_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 'غير مصرح: لا يوجد مستخدم'::TEXT, 0, 0::NUMERIC;
    RETURN;
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

  -- Check authorization: caller must exist, be parent/owner, same family
  SELECT role, family_id INTO v_caller_role, v_caller_family_id
  FROM members WHERE id = v_effective_caller_id;

  IF v_caller_role IS NULL THEN
    RETURN QUERY SELECT FALSE, 'غير مصرح: لا يوجد مستخدم'::TEXT, 0, 0::NUMERIC;
    RETURN;
  END IF;

  IF v_caller_family_id != v_gift.family_id OR v_caller_family_id != v_member.family_id THEN
    RETURN QUERY SELECT FALSE, 'غير مصرح: عائلة مختلفة'::TEXT, 0, 0::NUMERIC;
    RETURN;
  END IF;

  IF v_caller_role NOT IN ('owner', 'parent') THEN
    RETURN QUERY SELECT FALSE, 'غير مصرح: الوالدين فقط'::TEXT, 0, 0::NUMERIC;
    RETURN;
  END IF;

  -- Initialize
  v_xp_deducted := 0;
  v_money_deducted := 0;

  -- XP deduction
  IF v_gift.cost_xp IS NOT NULL AND v_gift.cost_xp > 0 THEN
    SELECT COALESCE(SUM(amount), 0) INTO v_current_xp
    FROM xp_transactions WHERE member_id = v_redemption.member_id;

    IF v_current_xp < v_gift.cost_xp THEN
      RETURN QUERY SELECT FALSE, 'النقاط غير كافية للموافقة'::TEXT, 0, 0::NUMERIC;
      RETURN;
    END IF;

    INSERT INTO xp_transactions (member_id, amount, source, source_id, description)
    VALUES (v_redemption.member_id, -v_gift.cost_xp, 'gift_redemption', v_redemption.gift_id,
            'Redeemed: ' || v_gift.title);
    v_xp_deducted := v_gift.cost_xp;
  END IF;

  -- Money deduction
  IF v_gift.cost_money IS NOT NULL AND v_gift.cost_money > 0 THEN
    SELECT COALESCE(SUM(CASE WHEN type = 'earned' THEN amount ELSE -amount END), 0)
    INTO v_current_money
    FROM money_transactions WHERE member_id = v_redemption.member_id AND status = 'approved';

    IF v_current_money < v_gift.cost_money THEN
      RETURN QUERY SELECT FALSE, 'الرصيد المالي غير كافية للموافقة'::TEXT, 0, 0::NUMERIC;
      RETURN;
    END IF;

    INSERT INTO money_transactions (member_id, amount, type, source, source_id, status, description)
    VALUES (v_redemption.member_id, v_gift.cost_money, 'withdrawn', 'gift_redemption', v_redemption.gift_id, 'approved',
            'Redeemed: ' || v_gift.title);
    v_money_deducted := v_gift.cost_money;
  END IF;

  -- Update redemption — STORE both xp_spent AND money_spent
  UPDATE gift_redemptions
  SET status = 'approved',
      xp_spent = v_xp_deducted,
      money_spent = v_money_deducted,
      approved_by = v_effective_caller_id,
      approved_at = NOW()
  WHERE id = p_redemption_id;

  -- Record activity
  INSERT INTO gift_activity (gift_redemption_id, action, performed_by, xp_amount, money_amount)
  VALUES (p_redemption_id, 'approved', v_effective_caller_id, v_xp_deducted, v_money_deducted);

  RETURN QUERY SELECT TRUE, 'تمت الموافقة على الهدية'::TEXT, v_xp_deducted, v_money_deducted;
END;
$function$;

-- 3. Fix revoke_gift_redemption — NULL/forged caller rejection
CREATE OR REPLACE FUNCTION public.revoke_gift_redemption(
  p_redemption_id uuid,
  p_reason text DEFAULT NULL,
  p_caller_member_id uuid DEFAULT NULL
)
RETURNS TABLE(success boolean, message text, xp_restored integer, money_restored numeric)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_effective_caller_id UUID;
  v_redemption RECORD;
  v_gift RECORD;
  v_caller_role TEXT;
  v_caller_family_id UUID;
  v_xp_restored INTEGER;
  v_money_restored NUMERIC;
BEGIN
  -- Determine caller identity
  IF p_caller_member_id IS NOT NULL THEN
    v_effective_caller_id := p_caller_member_id;
  ELSE
    v_effective_caller_id := get_current_member_id();
  END IF;

  -- REJECT NULL caller
  IF v_effective_caller_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 'غير مصرح: لا يوجد مستخدم'::TEXT, 0, 0::NUMERIC;
    RETURN;
  END IF;

  -- Get redemption details
  SELECT * INTO v_redemption FROM gift_redemptions WHERE id = p_redemption_id;

  IF v_redemption IS NULL THEN
    RETURN QUERY SELECT FALSE, 'طلب الهدية غير موجود'::TEXT, 0, 0::NUMERIC;
    RETURN;
  END IF;

  -- Can only revoke approved redemptions
  IF v_redemption.status != 'approved' THEN
    RETURN QUERY SELECT FALSE, 'لا يمكن إلغاء طلب غير موافق عليه'::TEXT, 0, 0::NUMERIC;
    RETURN;
  END IF;

  -- Get gift details (only for title/name, NOT for refund amount)
  SELECT * INTO v_gift FROM gifts WHERE id = v_redemption.gift_id;

  IF v_gift IS NULL THEN
    RETURN QUERY SELECT FALSE, 'الهدية غير موجودة'::TEXT, 0, 0::NUMERIC;
    RETURN;
  END IF;

  -- Check authorization: caller must exist, be parent/owner, same family
  SELECT role, family_id INTO v_caller_role, v_caller_family_id
  FROM members WHERE id = v_effective_caller_id;

  IF v_caller_role IS NULL THEN
    RETURN QUERY SELECT FALSE, 'غير مصرح: لا يوجد مستخدم'::TEXT, 0, 0::NUMERIC;
    RETURN;
  END IF;

  IF v_caller_family_id != v_gift.family_id THEN
    RETURN QUERY SELECT FALSE, 'غير مصرح: عائلة مختلفة'::TEXT, 0, 0::NUMERIC;
    RETURN;
  END IF;

  IF v_caller_role NOT IN ('owner', 'parent') THEN
    RETURN QUERY SELECT FALSE, 'غير مصرح: الوالدين فقط'::TEXT, 0, 0::NUMERIC;
    RETURN;
  END IF;

  -- Initialize restored amounts
  v_xp_restored := 0;
  v_money_restored := 0;

  -- Restore XP using STORED amount from redemption record (NOT gift's current price)
  IF v_redemption.xp_spent IS NOT NULL AND v_redemption.xp_spent > 0 THEN
    INSERT INTO xp_transactions (member_id, amount, source, source_id, description)
    VALUES (v_redemption.member_id, v_redemption.xp_spent, 'gift_revocation', v_redemption.gift_id,
            'Revoked: ' || v_gift.title);
    v_xp_restored := v_redemption.xp_spent;
  END IF;

  -- Restore money using STORED amount from redemption record (NOT gift's current price)
  IF v_redemption.money_spent IS NOT NULL AND v_redemption.money_spent > 0 THEN
    INSERT INTO money_transactions (member_id, amount, type, source, source_id, status, description)
    VALUES (v_redemption.member_id, v_redemption.money_spent, 'earned', 'gift_revocation', v_redemption.gift_id, 'approved',
            'Revoked: ' || v_gift.title);
    v_money_restored := v_redemption.money_spent;
  END IF;

  -- Update redemption status
  UPDATE gift_redemptions
  SET status = 'revoked',
      rejected_by = v_effective_caller_id,
      rejected_at = NOW(),
      rejection_reason = p_reason
  WHERE id = p_redemption_id;

  -- Record activity
  INSERT INTO gift_activity (gift_redemption_id, action, performed_by, xp_amount, money_amount, reason)
  VALUES (p_redemption_id, 'revoked', v_effective_caller_id, v_xp_restored, v_money_restored, p_reason);

  RETURN QUERY SELECT TRUE, 'تم إلغاء الموافقة على الهدية'::TEXT, v_xp_restored, v_money_restored;
END;
$function$;

-- 4. Fix reject_gift_redemption — NULL/forged caller rejection
CREATE OR REPLACE FUNCTION public.reject_gift_redemption(
  p_redemption_id uuid,
  p_reason text DEFAULT NULL,
  p_caller_member_id uuid DEFAULT NULL
)
RETURNS TABLE(success boolean, message text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_effective_caller_id UUID;
  v_redemption RECORD;
  v_gift RECORD;
  v_caller_role TEXT;
  v_caller_family_id UUID;
BEGIN
  -- Determine caller identity
  IF p_caller_member_id IS NOT NULL THEN
    v_effective_caller_id := p_caller_member_id;
  ELSE
    v_effective_caller_id := get_current_member_id();
  END IF;

  -- REJECT NULL caller
  IF v_effective_caller_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 'غير مصرح: لا يوجد مستخدم'::TEXT;
    RETURN;
  END IF;

  -- Get redemption details
  SELECT * INTO v_redemption FROM gift_redemptions WHERE id = p_redemption_id;

  IF v_redemption IS NULL THEN
    RETURN QUERY SELECT FALSE, 'طلب الهدية غير موجود'::TEXT;
    RETURN;
  END IF;

  -- Can only reject pending
  IF v_redemption.status != 'pending' THEN
    RETURN QUERY SELECT FALSE, 'تم معالجة هذا الطلب بالفعل'::TEXT;
    RETURN;
  END IF;

  -- Get gift details
  SELECT * INTO v_gift FROM gifts WHERE id = v_redemption.gift_id;

  IF v_gift IS NULL THEN
    RETURN QUERY SELECT FALSE, 'الهدية غير موجودة'::TEXT;
    RETURN;
  END IF;

  -- Check authorization: caller must exist, be parent/owner, same family
  SELECT role, family_id INTO v_caller_role, v_caller_family_id
  FROM members WHERE id = v_effective_caller_id;

  IF v_caller_role IS NULL THEN
    RETURN QUERY SELECT FALSE, 'غير مصرح: لا يوجد مستخدم'::TEXT;
    RETURN;
  END IF;

  IF v_caller_family_id != v_gift.family_id THEN
    RETURN QUERY SELECT FALSE, 'غير مصرح: عائلة مختلفة'::TEXT;
    RETURN;
  END IF;

  IF v_caller_role NOT IN ('owner', 'parent') THEN
    RETURN QUERY SELECT FALSE, 'غير مصرح: الوالدين فقط'::TEXT;
    RETURN;
  END IF;

  -- Mark as rejected
  UPDATE gift_redemptions
  SET status = 'rejected',
      rejected_by = v_effective_caller_id,
      rejected_at = NOW(),
      rejection_reason = p_reason
  WHERE id = p_redemption_id;

  -- Record activity
  INSERT INTO gift_activity (gift_redemption_id, action, performed_by, reason)
  VALUES (p_redemption_id, 'rejected', v_effective_caller_id, p_reason);

  RETURN QUERY SELECT TRUE, 'تم رفض طلب الهدية'::TEXT;
END;
$function$;

-- 5. Fix request_gift_redemption — NULL/forged caller rejection + p_caller_member_id
--    (Added p_caller_member_id for consistency with other RPCs and Code+PIN support)
CREATE OR REPLACE FUNCTION public.request_gift_redemption(
  p_gift_id UUID,
  p_member_id UUID,
  p_caller_member_id UUID DEFAULT NULL
)
RETURNS TABLE(success BOOLEAN, message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_gift RECORD;
  v_member RECORD;
  v_effective_caller_id UUID;
  v_caller_role TEXT;
  v_caller_family_id UUID;
  v_pending_count INTEGER;
BEGIN
  -- Determine caller identity
  IF p_caller_member_id IS NOT NULL THEN
    v_effective_caller_id := p_caller_member_id;
  ELSE
    v_effective_caller_id := get_current_member_id();
  END IF;

  -- REJECT NULL caller
  IF v_effective_caller_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 'غير مصرح: لا يوجد مستخدم'::TEXT;
    RETURN;
  END IF;

  -- Get gift details
  SELECT * INTO v_gift FROM gifts WHERE id = p_gift_id;

  IF v_gift IS NULL THEN
    RETURN QUERY SELECT FALSE, 'الهدية غير موجودة'::TEXT;
    RETURN;
  END IF;

  -- Get member details
  SELECT * INTO v_member FROM members WHERE id = p_member_id;

  IF v_member IS NULL THEN
    RETURN QUERY SELECT FALSE, 'العضو غير موجود'::TEXT;
    RETURN;
  END IF;

  -- Check authorization: caller must exist, same family
  SELECT role, family_id INTO v_caller_role, v_caller_family_id
  FROM members WHERE id = v_effective_caller_id;

  IF v_caller_role IS NULL THEN
    RETURN QUERY SELECT FALSE, 'غير مصرح: لا يوجد مستخدم'::TEXT;
    RETURN;
  END IF;

  IF v_caller_family_id != v_gift.family_id OR v_caller_family_id != v_member.family_id THEN
    RETURN QUERY SELECT FALSE, 'غير مصرح: عائلة مختلفة'::TEXT;
    RETURN;
  END IF;

  -- Check if gift is active
  IF NOT v_gift.is_active THEN
    RETURN QUERY SELECT FALSE, 'الهدية غير متوفرة'::TEXT;
    RETURN;
  END IF;

  -- Check XP balance (advisory — final check at approval)
  DECLARE
    v_current_xp NUMERIC;
  BEGIN
    SELECT COALESCE(SUM(amount), 0) INTO v_current_xp
    FROM xp_transactions WHERE member_id = p_member_id;

    IF v_current_xp < v_gift.cost_xp THEN
      RETURN QUERY SELECT FALSE, 'النقاط غير كافية'::TEXT;
      RETURN;
    END IF;
  END;

  -- Check for existing pending request for same gift by same member
  SELECT COUNT(*) INTO v_pending_count
  FROM gift_redemptions
  WHERE gift_id = p_gift_id AND member_id = p_member_id AND status = 'pending';

  IF v_pending_count > 0 THEN
    RETURN QUERY SELECT FALSE, 'يوجد طلب معلق بالفعل لهذه الهدية'::TEXT;
    RETURN;
  END IF;

  -- Create pending redemption request
  INSERT INTO gift_redemptions (gift_id, member_id, status, requested_xp_cost, redeemed_at)
  VALUES (p_gift_id, p_member_id, 'pending', v_gift.cost_xp, NOW());

  RETURN QUERY SELECT TRUE, 'تم إرسال طلب الهدية بنجاح'::TEXT;
END;
$function$;

COMMIT;
