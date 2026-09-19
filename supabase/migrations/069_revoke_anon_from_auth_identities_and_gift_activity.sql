-- ============================================================
-- Migration 069: Revoke browser SELECT on auth_identities + gift_activity
-- ============================================================
-- C1: auth_identities was readable from anon key, exposing
--     member_id ↔ auth_user_id mapping (cross-family identity leak).
--     Migration 038 intentionally left SELECT granted, assuming
--     RLS from 002 would protect it, but anon bypasses those
--     policies. Fix: explicit REVOKE.
--
--     Only legitimate browser caller was family-setup page.tsx
--     checking for existing identity. That query is moved to a
--     server API endpoint (see /api/family-setup/check-identity).
--
-- C2: gift_activity had permissive RLS (FOR ALL USING true) from
--     migration 058. Migration 059 revoked INSERT/UPDATE/DELETE
--     but NOT SELECT, leaving cross-family audit data readable.
--     Fix: explicit REVOKE. All access is server-side via
--     /api/activity/events (service-role client).
-- ============================================================

BEGIN;

-- C1: Revoke browser SELECT on auth_identities
REVOKE SELECT ON TABLE auth_identities FROM anon, authenticated;

-- C2: Revoke browser SELECT on gift_activity
REVOKE SELECT ON TABLE gift_activity FROM anon, authenticated;

COMMIT;
