-- Migration 036: Create OAuth Session RPC
-- Creates create_oauth_session RPC for secure OAuth-based authentication

BEGIN;

-- ============================================================
-- Create OAuth session RPC
-- ============================================================

-- This RPC creates a user_sessions record for OAuth users
-- It does NOT require a PIN (OAuth already authenticated the user)
-- It creates an internal session token that validate_member_session can verify

CREATE OR REPLACE FUNCTION create_oauth_session(
  p_member_id UUID
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_member_id UUID;
  v_session_token TEXT;
  v_expires_at TIMESTAMPTZ;
BEGIN
  -- Verify the member exists and get their info
  SELECT id INTO v_member_id
  FROM members
  WHERE id = p_member_id
    AND is_deleted = false;

  IF v_member_id IS NULL THEN
    RAISE EXCEPTION 'Member not found';
  END IF;

  -- Create session token
  v_session_token := encode(gen_random_bytes(32), 'hex');
  v_expires_at := NOW() + INTERVAL '30 days';

  -- Delete old sessions for this member (revoke previous sessions)
  DELETE FROM user_sessions WHERE member_id = v_member_id;

  -- Insert new session
  INSERT INTO user_sessions (member_id, session_token, expires_at)
  VALUES (v_member_id, v_session_token, v_expires_at);

  -- Return session token
  RETURN v_session_token;
END;
$$;

COMMIT;