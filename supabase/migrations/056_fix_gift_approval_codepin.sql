-- ============================================================
-- Migration 056: Fix gift approval/rejection for Code+PIN sessions
-- ============================================================
-- BUG: approve_gift_redemption and reject_gift_redemption call
--      get_current_member_id() which returns NULL for Code+PIN users.
--
-- FIX: Add optional p_caller_member_id parameter to both RPCs.
--      When provided, use it instead of get_current_member_id().
--      Preserve existing fallback for backward compatibility.
-- ============================================================

BEGIN;

-- Fix approve_gift_redemption
CREATE OR REPLACE FUNCTION public.approve_gift_redemption(
  p_redemption_id uuid,
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
  v_member RECORD;
  v_caller_role TEXT;
  v_caller_family_id UUID;
  v_current_xp NUMERIC;
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
    RETURN QUERY SELECT FALSE, 'طلب الهدية غير موجود'::TEXT;
    RETURN;
  END IF;

  -- Check if already processed
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

  -- Get member details
  SELECT * INTO v_member FROM members WHERE id = v_redemption.member_id;

  IF v_member IS NULL THEN
    RETURN QUERY SELECT FALSE, 'العضو غير موجود'::TEXT;
    RETURN;
  END IF;

  -- Check authorization (parent must be same family)
  IF v_effective_caller_id IS NOT NULL THEN
    SELECT role, family_id INTO v_caller_role, v_caller_family_id
    FROM members WHERE id = v_effective_caller_id;

    IF v_caller_family_id != v_gift.family_id OR v_caller_family_id != v_member.family_id THEN
      RETURN QUERY SELECT FALSE, 'غير مصرح: عائلة مختلفة'::TEXT;
      RETURN;
    END IF;

    IF v_caller_role NOT IN ('owner', 'parent') THEN
      RETURN QUERY SELECT FALSE, 'غير مصرح: الوالدين فقط'::TEXT;
      RETURN;
    END IF;
  END IF;

  -- Re-check XP balance (balance may have changed since request)
  SELECT COALESCE(SUM(amount), 0) INTO v_current_xp
  FROM xp_transactions WHERE member_id = v_redemption.member_id;

  IF v_current_xp < v_redemption.requested_xp_cost THEN
    RETURN QUERY SELECT FALSE, 'النقاط غير كافية للموافقة'::TEXT;
    RETURN;
  END IF;

  -- Deduct XP using the PRESERVED requested cost
  INSERT INTO xp_transactions (member_id, amount, source, source_id, description)
  VALUES (v_redemption.member_id, -v_redemption.requested_xp_cost, 'gift_redemption', v_redemption.gift_id,
          'Redeemed: ' || v_gift.title);

  -- Update redemption record
  UPDATE gift_redemptions
  SET status = 'approved',
      xp_spent = v_redemption.requested_xp_cost,
      approved_by = v_effective_caller_id,
      approved_at = NOW()
  WHERE id = p_redemption_id;

  RETURN QUERY SELECT TRUE, 'تمت الموافقة على الهدية'::TEXT;
END;
$function$;

-- Fix reject_gift_redemption
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

  -- Get redemption details
  SELECT * INTO v_redemption FROM gift_redemptions WHERE id = p_redemption_id;

  IF v_redemption IS NULL THEN
    RETURN QUERY SELECT FALSE, 'طلب الهدية غير موجود'::TEXT;
    RETURN;
  END IF;

  -- Check if already processed
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

  -- Check authorization
  IF v_effective_caller_id IS NOT NULL THEN
    SELECT role, family_id INTO v_caller_role, v_caller_family_id
    FROM members WHERE id = v_effective_caller_id;

    IF v_caller_family_id != v_gift.family_id THEN
      RETURN QUERY SELECT FALSE, 'غير مصرح: عائلة مختلفة'::TEXT;
      RETURN;
    END IF;

    IF v_caller_role NOT IN ('owner', 'parent') THEN
      RETURN QUERY SELECT FALSE, 'غير مصرح: الوالدين فقط'::TEXT;
      RETURN;
    END IF;
  END IF;

  -- Mark as rejected
  UPDATE gift_redemptions
  SET status = 'rejected',
      rejected_by = v_effective_caller_id,
      rejected_at = NOW(),
      rejection_reason = p_reason
  WHERE id = p_redemption_id;

  RETURN QUERY SELECT TRUE, 'تم رفض طلب الهدية'::TEXT;
END;
$function$;

COMMIT;