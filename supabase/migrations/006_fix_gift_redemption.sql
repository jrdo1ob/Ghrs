-- ============================================
-- Fix Critical: Gift redemption deducts XP from ledger
-- ============================================

CREATE OR REPLACE FUNCTION redeem_gift(
  p_gift_id UUID,
  p_member_id UUID
)
RETURNS TABLE(success BOOLEAN, message TEXT) AS $$
DECLARE
  v_gift RECORD;
  v_member_family_id UUID;
  v_total_xp BIGINT;
  v_gift_family_id UUID;
BEGIN
  SELECT * INTO v_gift FROM gifts WHERE id = p_gift_id;

  IF v_gift IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Gift not found'::TEXT;
    RETURN;
  END IF;

  SELECT family_id INTO v_member_family_id
  FROM members WHERE id = p_member_id;

  IF v_member_family_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Member not found'::TEXT;
    RETURN;
  END IF;

  v_gift_family_id := v_gift.family_id;

  IF v_gift_family_id != v_member_family_id THEN
    RETURN QUERY SELECT FALSE, 'Not authorized: different family'::TEXT;
    RETURN;
  END IF;

  IF NOT v_gift.is_active THEN
    RETURN QUERY SELECT FALSE, 'Gift is not available'::TEXT;
    RETURN;
  END IF;

  SELECT COALESCE(SUM(amount), 0) INTO v_total_xp
  FROM xp_transactions
  WHERE member_id = p_member_id;

  IF v_total_xp < v_gift.cost_xp THEN
    RETURN QUERY SELECT FALSE, 'Not enough XP'::TEXT;
    RETURN;
  END IF;

  -- Deduct XP with a negative transaction
  INSERT INTO xp_transactions (member_id, amount, source, source_id, description)
  VALUES (p_member_id, -v_gift.cost_xp, 'gift_redemption', p_gift_id, 'Redeemed: ' || v_gift.title);

  -- Create redemption record
  INSERT INTO gift_redemptions (gift_id, member_id, redeemed_at)
  VALUES (p_gift_id, p_member_id, NOW());

  RETURN QUERY SELECT TRUE, 'Gift redeemed successfully'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
