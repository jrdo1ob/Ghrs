-- ============================================================
-- Migration 058: Complete Gift Redemption Lifecycle
-- ============================================================
-- Adds:
-- 1. gift_activity table for gift-related audit trail
-- 2. revoke_gift_redemption RPC
-- 3. Updates child status values to support revoked state
-- ============================================================

BEGIN;

-- 0. Update status CHECK constraint to include 'revoked'
ALTER TABLE gift_redemptions DROP CONSTRAINT IF EXISTS gift_redemptions_status_check;
ALTER TABLE gift_redemptions ADD CONSTRAINT gift_redemptions_status_check
  CHECK (status IN ('pending', 'approved', 'rejected', 'revoked'));

-- 1. Create gift_activity table for audit trail
CREATE TABLE IF NOT EXISTS gift_activity (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gift_redemption_id UUID NOT NULL REFERENCES gift_redemptions(id),
  action TEXT NOT NULL, -- 'approved', 'rejected', 'revoked'
  performed_by UUID REFERENCES members(id),
  xp_amount INTEGER DEFAULT 0,
  money_amount NUMERIC DEFAULT 0,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE gift_activity ENABLE ROW LEVEL SECURITY;

-- Allow all for service-role access
DROP POLICY IF EXISTS "gift_activity_all" ON gift_activity;
CREATE POLICY "gift_activity_all" ON gift_activity FOR ALL USING (true);

-- 2. Create revoke_gift_redemption RPC
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

  -- Get redemption details
  SELECT * INTO v_redemption FROM gift_redemptions WHERE id = p_redemption_id;

  IF v_redemption IS NULL THEN
    RETURN QUERY SELECT FALSE, 'طلب الهدية غير موجود'::TEXT, 0, 0::NUMERIC;
    RETURN;
  END IF;

  -- Can only revoke approved/fulfilled redemptions
  IF v_redemption.status != 'approved' THEN
    RETURN QUERY SELECT FALSE, 'لا يمكن إلغاء طلب غير موافق عليه'::TEXT, 0, 0::NUMERIC;
    RETURN;
  END IF;

  -- Get gift details
  SELECT * INTO v_gift FROM gifts WHERE id = v_redemption.gift_id;

  IF v_gift IS NULL THEN
    RETURN QUERY SELECT FALSE, 'الهدية غير موجودة'::TEXT, 0, 0::NUMERIC;
    RETURN;
  END IF;

  -- Check authorization
  IF v_effective_caller_id IS NOT NULL THEN
    SELECT role, family_id INTO v_caller_role, v_caller_family_id
    FROM members WHERE id = v_effective_caller_id;

    IF v_caller_family_id != v_gift.family_id THEN
      RETURN QUERY SELECT FALSE, 'غير مصرح: عائلة مختلفة'::TEXT, 0, 0::NUMERIC;
      RETURN;
    END IF;

    IF v_caller_role NOT IN ('owner', 'parent') THEN
      RETURN QUERY SELECT FALSE, 'غير مصرح: الوالدين فقط'::TEXT, 0, 0::NUMERIC;
      RETURN;
    END IF;
  END IF;

  -- Initialize restored amounts
  v_xp_restored := 0;
  v_money_restored := 0;

  -- Restore XP if it was deducted
  IF v_redemption.xp_spent IS NOT NULL AND v_redemption.xp_spent > 0 THEN
    INSERT INTO xp_transactions (member_id, amount, source, source_id, description)
    VALUES (v_redemption.member_id, v_redemption.xp_spent, 'gift_revocation', v_redemption.gift_id,
            'Revoked: ' || v_gift.title);
    v_xp_restored := v_redemption.xp_spent;
  END IF;

  -- Restore money if it was deducted
  IF v_gift.cost_money IS NOT NULL AND v_gift.cost_money > 0 THEN
    INSERT INTO money_transactions (member_id, amount, type, source, source_id, status, description)
    VALUES (v_redemption.member_id, v_gift.cost_money, 'earned', 'gift_revocation', v_redemption.gift_id, 'approved',
            'Revoked: ' || v_gift.title);
    v_money_restored := v_gift.cost_money;
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

-- 3. Update approve_gift_redemption to also record activity
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

  -- Check authorization
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

  -- Update redemption
  UPDATE gift_redemptions
  SET status = 'approved',
      xp_spent = v_xp_deducted,
      approved_by = v_effective_caller_id,
      approved_at = NOW()
  WHERE id = p_redemption_id;

  -- Record activity
  INSERT INTO gift_activity (gift_redemption_id, action, performed_by, xp_amount, money_amount)
  VALUES (p_redemption_id, 'approved', v_effective_caller_id, v_xp_deducted, v_money_deducted);

  RETURN QUERY SELECT TRUE, 'تمت الموافقة على الهدية'::TEXT, v_xp_deducted, v_money_deducted;
END;
$function$;

-- 4. Update reject_gift_redemption to record activity
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

  -- Record activity
  INSERT INTO gift_activity (gift_redemption_id, action, performed_by, reason)
  VALUES (p_redemption_id, 'rejected', v_effective_caller_id, p_reason);

  RETURN QUERY SELECT TRUE, 'تم رفض طلب الهدية'::TEXT;
END;
$function$;

COMMIT;