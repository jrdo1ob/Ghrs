-- ============================================================
-- Migration 038: Revoke SELECT on family-private tables
-- ============================================================
-- PHASE 3 — Read Isolation at the DB layer
--
-- Problem (root cause):
--   Migration 037 revoked direct INSERT/UPDATE/DELETE from the browser
--   roles, but SELECT (reads) remained available to `anon` and
--   `authenticated` with permissive RLS (`USING (true)` from migration
--   009). This allowed an anonymous browser script or a direct Supabase
--   REST call to enumerate ANY family's sensitive data (child names,
--   pins, XP/money balances, tasks, stories, achievements, quran
--   progress, withdrawal requests, ...) with no authentication.
--   Proof: `GET {url}/rest/v1/members?select=id&limit=1` returned HTTP
--   200 + a real row using only the public anon key.
--
-- Approach:
--   Every family-data read now flows through authenticated Server APIs
--   (see /src/app/api/**/data) that:
--     1. Validate the GHRS session (HttpOnly cookie) OR a Supabase Auth
--        session, resolving the trusted member/family server-side.
--     2. Scope every query by the session's family_id / member_id.
--     3. Read via the service-role client (which bypasses role REVOKEs).
--
--   This migration REVOKEs SELECT from the browser roles (`anon`,
--   `authenticated`) on all family-private tables. Service-role (server
--   APIs) and SECURITY DEFINER RPCs are unaffected, so the server APIs
--   keep working while direct browser/anon reads are denied.
--
--   Global reference tables and auth tables remain readable from the
--   browser because they contain NO family-private data:
--     achievement_definitions, preset_tasks, preset_stories,
--     reward_presets, auth_identities (own-identity RLS policy),
--     user_sessions is revoked because it is never read from the browser.
-- ============================================================

BEGIN;

REVOKE SELECT ON TABLE members FROM anon, authenticated;
REVOKE SELECT ON TABLE families FROM anon, authenticated;
REVOKE SELECT ON TABLE family_pins FROM anon, authenticated;
REVOKE SELECT ON TABLE tasks FROM anon, authenticated;
REVOKE SELECT ON TABLE task_completions FROM anon, authenticated;
REVOKE SELECT ON TABLE task_approval_history FROM anon, authenticated;
REVOKE SELECT ON TABLE xp_transactions FROM anon, authenticated;
REVOKE SELECT ON TABLE money_transactions FROM anon, authenticated;
REVOKE SELECT ON TABLE gifts FROM anon, authenticated;
REVOKE SELECT ON TABLE gift_redemptions FROM anon, authenticated;
REVOKE SELECT ON TABLE stories FROM anon, authenticated;
REVOKE SELECT ON TABLE withdrawal_requests FROM anon, authenticated;
REVOKE SELECT ON TABLE family_invitations FROM anon, authenticated;
REVOKE SELECT ON TABLE quran_progress FROM anon, authenticated;
REVOKE SELECT ON TABLE member_achievements FROM anon, authenticated;
REVOKE SELECT ON TABLE user_sessions FROM anon, authenticated;

COMMIT;