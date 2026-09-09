-- ============================================================
-- Migration 044: Atomic family setup RPC
-- ============================================================
-- PHASE 5 — Remove the family-setup TOCTOU race
--
-- The family-setup API previously ran three separate client
-- inserts (families, members, auth_identities) with only an
-- application-level pre-check. Two concurrent requests for the
-- same auth user could both pass the check, create a family and an
-- owner member, and then have one link fail on the
-- UNIQUE(auth_identities.auth_user_id) backstop — leaving an
-- orphan family + member behind. Retries accumulated orphans.
--
-- This migration introduces a dedicated SECURITY DEFINER RPC that
-- performs the whole operation in one database transaction:
--
--   1. verify the auth user is not already linked;
--   2. generate a collision-safe 6-char family code (same charset
--      and length as the removed application-side generator);
--   3. create the family;
--   4. create the owner member;
--   5. create the auth identity.
--
-- Concurrency handling:
--   * The UNIQUE(auth_identities.auth_user_id) constraint is the
--     concurrency backstop. When a second concurrent attempt hits
--     that violation, the inner subtransaction (family + member +
--     identity) is rolled back, so NO orphan rows can remain — the
--     only committed rows are the winner's.
--   * A families_code_key race (two different auth users drawing
--     the same code simultaneously) is re-rolled with a fresh code
--     instead of erroring.
--
-- The RPC is only executable by service_role (the server API uses
-- the service-role client). PUBLIC, anon and authenticated are
-- revoked so the browser cannot call it directly.
--
-- The RPC performs no lifecycle, approval, XP, money, RLS,
-- authentication, or task changes. Table structure is unchanged.

BEGIN;

-- ============================================================
-- 1. Atomic family setup RPC
-- ============================================================

CREATE OR REPLACE FUNCTION setup_family(
  p_auth_user_id UUID,
  p_family_name TEXT,
  p_owner_name TEXT
)
RETURNS TABLE(
  success BOOLEAN,
  already_exists BOOLEAN,
  family_id UUID,
  member_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_family_id UUID;
  v_member_id UUID;
  v_family_code TEXT;
  v_existing_member_id UUID;
  v_attempts INTEGER := 0;
  v_chars CONSTANT TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  v_char_pos INTEGER;
BEGIN
  -- 1. Fast-path: auth user already linked to a family member.
  SELECT ai.member_id INTO v_existing_member_id
  FROM auth_identities ai
  WHERE ai.auth_user_id = p_auth_user_id
  LIMIT 1;

  IF v_existing_member_id IS NOT NULL THEN
    RETURN QUERY SELECT TRUE, TRUE, NULL::UUID, NULL::UUID;
    RETURN;
  END IF;

  -- 2. Create family + owner member + identity inside one subtransaction.
  --    Any unique_violation rolls the subtransaction back to the savepoint,
  --    so no orphan family/member can remain.
  LOOP
    v_attempts := v_attempts + 1;

    BEGIN
      -- Generate a collision-safe unique family code.
      -- Same charset + length as the removed app-side Math.random generator.
      LOOP
        v_family_code := '';
        FOR v_char_pos IN 1..6 LOOP
          v_family_code := v_family_code ||
            substr(v_chars, 1 + floor(random() * 36)::INT, 1);
        END LOOP;

        EXIT WHEN NOT EXISTS (
          SELECT 1 FROM families WHERE code = v_family_code
        );
      END LOOP;

      INSERT INTO families (name, code, created_by)
      VALUES (p_family_name, v_family_code, p_auth_user_id)
      RETURNING id INTO v_family_id;

      INSERT INTO members (family_id, name, role)
      VALUES (v_family_id, p_owner_name, 'owner')
      RETURNING id INTO v_member_id;

      INSERT INTO auth_identities (member_id, auth_user_id, provider)
      VALUES (v_member_id, p_auth_user_id, 'email');

      RETURN QUERY SELECT TRUE, FALSE, v_family_id, v_member_id;
      RETURN;
    EXCEPTION WHEN unique_violation THEN
      -- Subtransaction rolled back: this attempt created no rows.
      -- If a concurrent request linked this auth user first, report
      -- already-setup (matches the old API's repeated-setup message).
      IF EXISTS (
        SELECT 1 FROM auth_identities WHERE auth_user_id = p_auth_user_id
      ) THEN
        RETURN QUERY SELECT TRUE, TRUE, NULL::UUID, NULL::UUID;
        RETURN;
      END IF;

      -- Otherwise it was a families_code_key race; retry with a new code.
      -- Cap retries to avoid an unbounded loop under pathological load.
      IF v_attempts < 10 THEN
        CONTINUE;
      END IF;

      RAISE;
    END;
  END LOOP;
END;
$$;

-- ============================================================
-- 2. Lock EXECUTE to service_role only
-- ============================================================

REVOKE EXECUTE ON FUNCTION setup_family(uuid, text, text)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION setup_family(uuid, text, text)
TO service_role;

COMMIT;