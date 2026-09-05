-- ============================================================
-- Migration 037: Enforce family isolation at the DB layer
-- ============================================================
-- PHASE 2 — Real Family Isolation Security Boundary
--
-- Problem (root cause):
--   Migration 009 replaced all RLS policies with permissive
--   `USING (true)` / `WITH CHECK (true)` on every family-data table,
--   so a malicious browser script (or direct Supabase REST call) could
--   read AND modify any family's data (cross-family IDOR) with no
--   authorization at the database layer.
--
-- Approach:
--   GHRS member sessions (Parent/Child) live in an HttpOnly cookie that
--   PostgreSQL RLS cannot read, so DB-level family-scoped policies
--   (`auth.uid()`) cannot identify those users. The correct boundary is:
--
--   1. ALL mutations (INSERT/UPDATE/DELETE) on family-data tables now
--      flow exclusively through family-verified Server APIs that run as
--      the service-role (they verify the GHRS session, resolve the
--      trusted family_id from the session record, and verify that the
--      target record belongs to that family BEFORE touching the DB).
--
--   2. REVOKE direct INSERT/UPDATE/DELETE from the `anon` and
--      `authenticated` roles on those tables, so a browser/direct call
--      can no longer modify any family's data. Service-role (server
--      APIs) and SECURITY DEFINER RPCs are unaffected by role REVOKEs.
--
--   3. REVOKE EXECUTE on the mutating RPCs that were previously
--      callable directly from the browser (several of which were FAIL-OPEN
--      IDORs, e.g. approve/reject/revoke/redeem). They are now invoked
--      only via Server APIs using service-role, so the browser cannot
--      call them directly anymore.
--
--   Reads remain family-scoped at the application layer using the
--   server-validated session's family_id (PostgreSQL cannot resolve a
--   GHRS session to a family, so SELECT RLS stays permissive — see the
--   final Phase-2 report for this documented residual).
-- ============================================================

BEGIN;

-- ============================================================
-- 1. Revoke direct DML on family-data tables from browser roles
-- ============================================================
REVOKE INSERT, UPDATE, DELETE ON TABLE members FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE tasks FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE task_completions FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE task_approval_history FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE xp_transactions FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE money_transactions FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE gifts FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE gift_redemptions FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE stories FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE withdrawal_requests FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE family_invitations FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE quran_progress FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE member_achievements FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE user_sessions FROM anon, authenticated;

-- Keep SELECT permissive (RLS `USING (true)` policies in migration 009
-- remain) so GHRS-session Parent/Child reads keep working at the app layer.

-- ============================================================
-- 2. Revoke EXECUTE on mutating RPCs previously callable from the browser
-- ============================================================
-- These RPCs are now invoked ONLY through Server APIs (service-role),
-- which bypass role grants. PostgreSQL grants EXECUTE to PUBLIC by
-- default on new functions, so we must revoke from PUBLIC (covers
-- everything) and re-grant only the RPCs the browser must still call.
REVOKE EXECUTE ON FUNCTION approve_task_completion(uuid, boolean, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION reject_task_completion(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION revoke_task_approval(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION redeem_gift(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION add_preset_task(uuid, uuid, uuid, integer, numeric) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION add_preset_task(uuid, uuid, integer, numeric) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION delete_task(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION toggle_task_pause(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION apply_manual_adjustment(uuid, text, text, integer, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION set_member_pin(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION generate_unique_login_code(text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION complete_task_with_rewards(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION delete_story(uuid) FROM PUBLIC, anon, authenticated;

-- ============================================================
-- 3. Re-grant EXECUTE on the RPCs the browser must still call directly
-- ============================================================
-- These three are used directly from browser components and are SAFE:
-- they validate the caller with get_current_member_id() and fail-closed
-- ('Access denied') when the caller's family does not match, so they
-- cannot be used for cross-family writes.
GRANT EXECUTE ON FUNCTION add_preset_reward(uuid, uuid, integer, numeric) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION create_story(uuid, text, text, text, integer, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION add_preset_story(uuid, uuid, uuid) TO anon, authenticated;

COMMIT;
