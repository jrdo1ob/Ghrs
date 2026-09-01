-- ============================================
-- Fix generateLoginCode race condition
-- ============================================

CREATE OR REPLACE FUNCTION generate_unique_login_code(
  p_family_code TEXT,
  p_role TEXT
)
RETURNS TEXT AS $$
DECLARE
  v_count BIGINT;
  v_prefix TEXT;
  v_login_code TEXT;
  v_attempts INT := 0;
  v_max_attempts INT := 100;
BEGIN
  -- Get count of existing members with this role
  SELECT COUNT(*) INTO v_count
  FROM members m
  JOIN families f ON f.id = m.family_id
  WHERE f.code = p_family_code AND m.role = p_role;

  v_prefix := CASE WHEN p_role = 'child' THEN '100' ELSE '000' END;

  LOOP
    v_login_code := p_family_code || '-' || v_prefix || (v_count + 1);
    v_attempts := v_attempts + 1;

    -- Check if code already exists
    IF NOT EXISTS (SELECT 1 FROM members WHERE login_code = v_login_code) THEN
      RETURN v_login_code;
    END IF;

    -- If code exists, increment and try again
    v_count := v_count + 1;

    IF v_attempts >= v_max_attempts THEN
      RAISE EXCEPTION 'Could not generate unique login code after % attempts', v_max_attempts;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
