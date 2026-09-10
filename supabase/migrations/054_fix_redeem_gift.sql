-- ============================================================
-- Migration 054: Fix redeem_gift field references + add xp_spent
-- ============================================================
-- BUG: redeem_gift references v_gift.xp_cost (wrong) and v_gift.name (wrong).
-- FIX: Use v_gift.cost_xp and v_gift.title.
--
-- ENHANCEMENT: Add xp_spent column to gift_redemptions to preserve
-- the exact XP cost at redemption time (gifts.cost_xp may change later).
--
-- EXISTING DATA: gift_redemptions has 0 rows (verified), so no backfill needed.
-- ============================================================

BEGIN;

-- 1. Add xp_spent column to gift_redemptions
ALTER TABLE gift_redemptions ADD COLUMN xp_spent INTEGER DEFAULT 0;

-- 2. Fix redeem_gift function
CREATE OR REPLACE FUNCTION public.redeem_gift(p_gift_id uuid, p_member_id uuid)
RETURNS TABLE(success boolean, message text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_gift RECORD;
  v_member RECORD;
  v_caller_member_id UUID;
  v_caller_role TEXT;
  v_caller_family_id UUID;
  v_current_xp NUMERIC;
BEGIN
  -- Get caller info
  v_caller_member_id := get_current_member_id();
  
  -- Get gift details
  SELECT * INTO v_gift FROM gifts WHERE id = p_gift_id;
  
  IF v_gift IS NULL THEN
    success := FALSE;
    message := 'Gift not found';
    RETURN NEXT;
    RETURN;
  END IF;
  
  -- Get member details
  SELECT * INTO v_member FROM members WHERE id = p_member_id;
  
  IF v_member IS NULL THEN
    success := FALSE;
    message := 'Member not found';
    RETURN NEXT;
    RETURN;
  END IF;
  
  -- Check authorization
  IF v_caller_member_id IS NOT NULL THEN
    SELECT role, family_id INTO v_caller_role, v_caller_family_id
    FROM members WHERE id = v_caller_member_id;
    
    IF v_caller_family_id != v_gift.family_id OR v_caller_family_id != v_member.family_id THEN
      success := FALSE;
      message := 'Access denied: different family';
      RETURN NEXT;
      RETURN;
    END IF;
  END IF;
  
  -- Check if gift is active
  IF NOT v_gift.is_active THEN
    success := FALSE;
    message := 'Gift is not available';
    RETURN NEXT;
    RETURN;
  END IF;
  
  -- Check XP balance
  SELECT COALESCE(SUM(amount), 0) INTO v_current_xp
  FROM xp_transactions WHERE member_id = p_member_id;
  
  IF v_current_xp < v_gift.cost_xp THEN
    success := FALSE;
    message := 'Insufficient XP';
    RETURN NEXT;
    RETURN;
  END IF;
  
  -- Deduct XP
  INSERT INTO xp_transactions (member_id, amount, source, source_id, description)
  VALUES (p_member_id, -v_gift.cost_xp, 'gift_redemption', p_gift_id, 'Redeemed: ' || v_gift.title);
  
  -- Create redemption record with xp_spent
  INSERT INTO gift_redemptions (gift_id, member_id, xp_spent, redeemed_at)
  VALUES (p_gift_id, p_member_id, v_gift.cost_xp, NOW());
  
  success := TRUE;
  message := 'Gift redeemed successfully';
  RETURN NEXT;
END;
$function$;

COMMIT;