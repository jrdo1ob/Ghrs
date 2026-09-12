-- ============================================================
-- Migration 055: Gift Redemption Parent Approval Workflow
-- ============================================================
-- Adds parent approval workflow to gift redemption.
--
-- CHANGES:
--   1. Add status, requested_xp_cost, approval/rejection fields
--   2. Create request_gift_redemption RPC (child request)
--   3. Create approve_gift_redemption RPC (parent approve)
--   4. Create reject_gift_redemption RPC (parent reject)
--   5. Mark existing redemptions as 'approved' (legacy data)
--
-- HISTORICAL DATA:
--   Existing rows have xp_spent populated and represent completed
--   redemptions. They are marked as 'approved' with redeemed_at
--   preserved as the approval timestamp.
-- ============================================================

BEGIN;

-- 1. Add new columns to gift_redemptions
ALTER TABLE gift_redemptions ADD COLUMN status TEXT NOT NULL DEFAULT 'approved';
ALTER TABLE gift_redemptions ADD COLUMN requested_xp_cost INTEGER;
ALTER TABLE gift_redemptions ADD COLUMN approved_by UUID REFERENCES members(id);
ALTER TABLE gift_redemptions ADD COLUMN approved_at TIMESTAMPTZ;
ALTER TABLE gift_redemptions ADD COLUMN rejected_by UUID REFERENCES members(id);
ALTER TABLE gift_redemptions ADD COLUMN rejected_at TIMESTAMPTZ;
ALTER TABLE gift_redemptions ADD COLUMN rejection_reason TEXT;

-- Add CHECK constraint for status
ALTER TABLE gift_redemptions ADD CONSTRAINT gift_redemptions_status_check
  CHECK (status IN ('pending', 'approved', 'rejected'));

-- 2. Mark existing redemptions as approved (legacy direct redemptions)
-- These rows already have xp_spent populated and represent completed redemptions
UPDATE gift_redemptions
SET status = 'approved',
    approved_at = redeemed_at
WHERE status = 'approved' AND approved_at IS NULL;

-- 3. Create request_gift_redemption RPC (child request)
CREATE OR REPLACE FUNCTION public.request_gift_redemption(
  p_gift_id UUID,
  p_member_id UUID
)
RETURNS TABLE(success BOOLEAN, message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_gift RECORD;
  v_member RECORD;
  v_caller_member_id UUID;
  v_caller_role TEXT;
  v_caller_family_id UUID;
  v_pending_count INTEGER;
BEGIN
  -- Get caller info
  v_caller_member_id := get_current_member_id();

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

  -- Check authorization
  IF v_caller_member_id IS NOT NULL THEN
    SELECT role, family_id INTO v_caller_role, v_caller_family_id
    FROM members WHERE id = v_caller_member_id;

    IF v_caller_family_id != v_gift.family_id OR v_caller_family_id != v_member.family_id THEN
      RETURN QUERY SELECT FALSE, 'غير مصرح: عائلة مختلفة'::TEXT;
      RETURN;
    END IF;
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

-- 4. Create approve_gift_redemption RPC (parent approve)
CREATE OR REPLACE FUNCTION public.approve_gift_redemption(
  p_redemption_id UUID
)
RETURNS TABLE(success BOOLEAN, message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_redemption RECORD;
  v_gift RECORD;
  v_member RECORD;
  v_caller_member_id UUID;
  v_caller_role TEXT;
  v_caller_family_id UUID;
  v_current_xp NUMERIC;
BEGIN
  -- Get caller info
  v_caller_member_id := get_current_member_id();

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
  IF v_caller_member_id IS NOT NULL THEN
    SELECT role, family_id INTO v_caller_role, v_caller_family_id
    FROM members WHERE id = v_caller_member_id;

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
      approved_by = v_caller_member_id,
      approved_at = NOW()
  WHERE id = p_redemption_id;

  RETURN QUERY SELECT TRUE, 'تمت الموافقة على الهدية'::TEXT;
END;
$function$;

-- 5. Create reject_gift_redemption RPC (parent reject)
CREATE OR REPLACE FUNCTION public.reject_gift_redemption(
  p_redemption_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS TABLE(success BOOLEAN, message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_redemption RECORD;
  v_gift RECORD;
  v_caller_member_id UUID;
  v_caller_role TEXT;
  v_caller_family_id UUID;
BEGIN
  -- Get caller info
  v_caller_member_id := get_current_member_id();

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
  IF v_caller_member_id IS NOT NULL THEN
    SELECT role, family_id INTO v_caller_role, v_caller_family_id
    FROM members WHERE id = v_caller_member_id;

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
      rejected_by = v_caller_member_id,
      rejected_at = NOW(),
      rejection_reason = p_reason
  WHERE id = p_redemption_id;

  RETURN QUERY SELECT TRUE, 'تم رفض طلب الهدية'::TEXT;
END;
$function$;

COMMIT;