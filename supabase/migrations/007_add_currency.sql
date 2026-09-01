-- ============================================
-- Add currency to families table
-- ============================================

ALTER TABLE families ADD COLUMN currency TEXT NOT NULL DEFAULT 'KWD';

UPDATE families SET currency = 'KWD' WHERE currency IS NULL;

CREATE OR REPLACE FUNCTION update_family_currency(
  p_family_id UUID,
  p_currency TEXT
)
RETURNS VOID AS $$
DECLARE
  v_caller_family_id UUID;
BEGIN
  SELECT family_id INTO v_caller_family_id
  FROM get_current_member();

  IF v_caller_family_id IS NULL OR v_caller_family_id != p_family_id THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE families SET currency = p_currency WHERE id = p_family_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
