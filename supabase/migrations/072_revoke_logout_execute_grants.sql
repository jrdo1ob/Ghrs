-- Migration 072: Revoke unused EXECUTE grants from logout_member_session
-- P0.1 remediation: remove final unnecessary EXECUTE privileges
--
-- logout_member_session(text) was intentionally excluded from Migration 071
-- because the logout route previously used the server client (anon key).
-- The logout route has now been migrated to createServiceRoleClient().
-- This migration completes the P0.1 remediation by revoking PUBLIC/anon/authenticated
-- EXECUTE from logout_member_session.
--
-- Source: Production catalog verification on xcbedqffmknlzjfpuwdr (PostgreSQL 17.6.1.166)
-- Date: 2026-09-21

BEGIN;

-- logout_member_session(p_session_token text)
-- Called by: src/app/api/auth/logout/route.ts (via service-role client)
-- No other callers
REVOKE EXECUTE ON FUNCTION public.logout_member_session(text)
  FROM PUBLIC, anon, authenticated;

COMMIT;
