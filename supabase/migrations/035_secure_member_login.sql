-- Migration 035: Secure Member Login
-- Creates login_with_code_and_pin RPC for secure server-side authentication

BEGIN;

-- ============================================================
-- 1. Create secure login RPC
-- ============================================================

-- This RPC accepts login_code + PIN (NOT member_id)
-- Server determines member_id from login_code (TRUSTED)
-- Server verifies PIN (TRUSTED)
-- Server creates session (TRUSTED)
-- Returns only session_token (browser never sees member_id)

CREATE OR REPLACE FUNCTION login_with_code_and_pin(
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
SET search_path = public
AS $$
DECLARE
  v_member_id UUID;
  v_member_name TEXT;
  v_member_role TEXT;
  v_stored_hash TEXT;
  v_session_token TEXT;
  v_expires_at TIMESTAMPTZ;
BEGIN
  -- 1. Look up member by login_code (SERVER-SIDE, TRUSTED)
  -- Browser cannot choose member_id — server determines it from login_code
  SELECT id, name, role INTO v_member_id, v_member_name, v_member_role
  FROM members
  WHERE login_code = UPPER(p_login_code)
    AND is_deleted = false;

  IF v_member_id IS NULL THEN
    RAISE EXCEPTION 'Invalid login code';
  END IF;

  -- 2. Verify PIN (SERVER-SIDE, TRUSTED)
  -- Check family_pins first, fall back to members.pin_hash
  SELECT pin_hash INTO v_stored_hash
  FROM family_pins
  WHERE member_id = v_member_id;

  IF v_stored_hash IS NULL THEN
    SELECT pin_hash INTO v_stored_hash
    FROM members
    WHERE id = v_member_id;
  END IF;

  IF v_stored_hash IS NULL OR v_stored_hash != crypt(p_pin, v_stored_hash) THEN
    RAISE EXCEPTION 'Invalid PIN';
  END IF;

  -- 3. Create session (SERVER-SIDE, TRUSTED)
  -- Generate cryptographically secure random token
  v_session_token := encode(gen_random_bytes(32), 'hex');
  v_expires_at := NOW() + INTERVAL '30 days';

  -- Delete old sessions for this member (revoke previous sessions)
  DELETE FROM user_sessions WHERE member_id = v_member_id;

  -- Insert new session
  INSERT INTO user_sessions (member_id, session_token, expires_at)
  VALUES (v_member_id, v_session_token, v_expires_at);

  -- 4. Return ONLY session token and role (NOT member_id)
  -- Browser never sees member_id — it only gets the opaque session token
  RETURN QUERY
  SELECT v_session_token, v_member_role, v_member_name;
END;
$$;

-- ============================================================
-- 2. Create session validation RPC
-- ============================================================

-- This RPC validates a session token and returns fresh member data
-- Used by middleware/server-side code to verify sessions

CREATE OR REPLACE FUNCTION validate_member_session(
  p_session_token TEXT
)
RETURNS TABLE(
  member_id UUID,
  member_name TEXT,
  member_role TEXT,
  family_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT m.id, m.name, m.role, m.family_id
  FROM user_sessions s
  JOIN members m ON s.member_id = m.id
  WHERE s.session_token = p_session_token
    AND s.expires_at > NOW();
END;
$$;

-- ============================================================
-- 3. Create logout RPC
-- ============================================================

-- This RPC deletes a session (logout/revocation)

CREATE OR REPLACE FUNCTION logout_member_session(
  p_session_token TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  DELETE FROM user_sessions
  WHERE session_token = p_session_token;

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RETURN v_deleted_count > 0;
END;
$$;

-- ============================================================
-- 4. Add UNIQUE constraint on login_code (if safe)
-- ============================================================

-- Check for duplicates first
DO $$
BEGIN
  -- Only add constraint if no duplicates exist
  IF NOT EXISTS (
    SELECT login_code, COUNT(*) as cnt
    FROM members
    WHERE login_code IS NOT NULL
    GROUP BY login_code
    HAVING COUNT(*) > 1
  ) THEN
    ALTER TABLE members ADD CONSTRAINT members_login_code_unique UNIQUE (login_code);
    RAISE NOTICE 'Added UNIQUE constraint on members.login_code';
  ELSE
    RAISE NOTICE 'Skipped UNIQUE constraint — duplicates exist';
  END IF;
END $$;

COMMIT;