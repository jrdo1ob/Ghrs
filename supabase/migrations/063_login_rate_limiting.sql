-- Migration 063: Login Rate Limiting and Account Lockout
-- P0 #2 remediation: prevent brute-force attacks on login_with_code_and_pin
--
-- Changes:
-- 1. Add failed_login_attempts and login_locked_until columns to members
-- 2. Rewrite login_with_code_and_pin with lockout logic and unified error messages
-- 3. REVOKE EXECUTE from PUBLIC/anon/authenticated on login_with_code_and_pin
-- 4. REVOKE EXECUTE from PUBLIC/anon/authenticated on verify_member_pin
-- 5. GRANT EXECUTE to service_role on both functions

BEGIN;

-- ============================================================
-- 1. Add rate-limiting columns to members table
-- ============================================================

ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS failed_login_attempts integer NOT NULL DEFAULT 0;

ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS login_locked_until timestamptz NULL;

-- ============================================================
-- 2. Rewrite login_with_code_and_pin with lockout logic
-- Uses RETURN (empty result set) instead of RAISE EXCEPTION for failures
-- so that UPDATE side effects (counter increments) persist in the PostgREST transaction.
-- ============================================================

CREATE OR REPLACE FUNCTION public.login_with_code_and_pin(
  p_login_code TEXT,
  p_pin TEXT
)
RETURNS TABLE(
  session_token TEXT,
  member_role TEXT,
  member_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, extensions
AS $$
DECLARE
  v_member RECORD;
  v_stored_hash TEXT;
  v_new_token TEXT;
  v_expires_at TIMESTAMPTZ;
  v_new_attempt_count INTEGER;
BEGIN
  -- 1. Look up member by login_code
  SELECT id, name, role, pin_hash, failed_login_attempts, login_locked_until
  INTO v_member
  FROM members
  WHERE login_code = UPPER(p_login_code)
    AND is_deleted = false;

  -- Generic failure: return empty (do not reveal whether code exists)
  IF v_member IS NULL THEN
    RETURN;
  END IF;

  -- 2. Check if account is locked
  IF v_member.login_locked_until IS NOT NULL
     AND v_member.login_locked_until > NOW() THEN
    -- Still increment attempts while locked (prevents timing-based enumeration)
    UPDATE members
    SET failed_login_attempts = failed_login_attempts + 1
    WHERE id = v_member.id;
    -- RETURN (not RAISE) so the UPDATE persists in the transaction
    RETURN;
  END IF;

  -- 3. Verify PIN
  -- Check family_pins first, fall back to members.pin_hash
  SELECT fp.pin_hash INTO v_stored_hash
  FROM family_pins fp
  WHERE fp.member_id = v_member.id;

  IF v_stored_hash IS NULL THEN
    v_stored_hash := v_member.pin_hash;
  END IF;

  IF v_stored_hash IS NULL OR v_stored_hash != crypt(p_pin, v_stored_hash) THEN
    -- PIN incorrect: increment attempts atomically
    v_new_attempt_count := v_member.failed_login_attempts + 1;

    IF v_new_attempt_count >= 5 THEN
      -- Threshold reached: lock account for 15 minutes
      UPDATE members
      SET failed_login_attempts = v_new_attempt_count,
          login_locked_until = NOW() + INTERVAL '15 minutes'
      WHERE id = v_member.id;
    ELSE
      UPDATE members
      SET failed_login_attempts = v_new_attempt_count
      WHERE id = v_member.id;
    END IF;

    -- RETURN (not RAISE) so the UPDATE persists in the transaction
    RETURN;
  END IF;

  -- 4. PIN correct: reset lockout state and create session
  UPDATE members
  SET failed_login_attempts = 0,
      login_locked_until = NULL
  WHERE id = v_member.id;

  v_new_token := encode(gen_random_bytes(32), 'hex');
  v_expires_at := NOW() + INTERVAL '30 days';

  -- Delete old sessions for this member
  DELETE FROM user_sessions WHERE member_id = v_member.id;

  -- Insert new session
  INSERT INTO user_sessions (member_id, session_token, expires_at)
  VALUES (v_member.id, v_new_token, v_expires_at);

  RETURN QUERY
  SELECT v_new_token, v_member.role, v_member.name;
END;
$$;

-- ============================================================
-- 3. Revoke EXECUTE from browser-facing roles on login_with_code_and_pin
-- ============================================================

REVOKE EXECUTE
ON FUNCTION public.login_with_code_and_pin(TEXT, TEXT)
FROM PUBLIC, anon, authenticated;

-- Ensure service_role retains EXECUTE (explicit grant)
GRANT EXECUTE
ON FUNCTION public.login_with_code_and_pin(TEXT, TEXT)
TO service_role;

-- ============================================================
-- 4. Revoke EXECUTE from browser-facing roles on verify_member_pin
-- ============================================================

REVOKE EXECUTE
ON FUNCTION public.verify_member_pin(UUID, TEXT)
FROM PUBLIC, anon, authenticated;

-- Ensure service_role retains EXECUTE (explicit grant)
GRANT EXECUTE
ON FUNCTION public.verify_member_pin(UUID, TEXT)
TO service_role;

COMMIT;
