-- Migration 078: Standardize SECURITY DEFINER search_path
-- F7 remediation: align e2e_hash_pin, get_daily_goal, and set_daily_goal
-- with the project-standard search_path = public, extensions
--
-- Affected functions (introduced in migrations 074 and 076):
--   1. e2e_hash_pin(TEXT)        — migration 074, currently SET search_path = public
--   2. get_daily_goal(UUID)      — migration 076, currently SET search_path = public
--   3. set_daily_goal(UUID, INTEGER, UUID) — migration 076, currently SET search_path = public
--
-- Strategy: ALTER FUNCTION ... SET search_path (preserves function body,
--   ownership, SECURITY DEFINER attribute, and all existing behavior).
--   Same approach used by migrations 064, 070, 073, and 077.
--
-- Rationale for including e2e_hash_pin:
--   Although e2e_hash_pin is test-only (E2E project only, not Production),
--   it uses the same SECURITY DEFINER + search_path pattern as all other
--   application-owned functions. Consistency prevents confusion during future
--   audits and ensures the E2E test infrastructure mirrors Production security
--   posture. The function is not harmful in Production (it would only hash
--   pins), and EXECUTE is already restricted to service_role only.

BEGIN;

-- 1. e2e_hash_pin(TEXT) — migration 074
--    Uses crypt()/gen_salt() from pgcrypto (installed in public schema via
--    CREATE EXTENSION IF NOT EXISTS pgcrypto in migration 001). The extensions
--    schema is included for project-standard consistency.
ALTER FUNCTION public.e2e_hash_pin(text)
  SET search_path = public, extensions;

-- 2. get_daily_goal(UUID) — migration 076
--    References: daily_goals, task_completions (public schema tables).
--    No extensions-schema objects used directly; included for consistency.
ALTER FUNCTION public.get_daily_goal(uuid)
  SET search_path = public, extensions;

-- 3. set_daily_goal(UUID, INTEGER, UUID) — migration 076
--    References: daily_goals, task_completions, members (public schema tables),
--    get_current_member_id() (public schema function).
--    No extensions-schema objects used directly; included for consistency.
ALTER FUNCTION public.set_daily_goal(uuid, integer, uuid)
  SET search_path = public, extensions;

COMMIT;
