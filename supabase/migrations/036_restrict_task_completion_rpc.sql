-- Migration 036: Restrict Task Completion RPC Execution
-- Documents the production permission change already applied.
--
-- This migration is being added as the canonical record of the production state.
-- The REVOKE has already been applied to the production database.
-- DO NOT execute this migration against production (it will fail with "already revoked").
--
-- Purpose:
-- Prevent browser/client roles (PUBLIC, anon, authenticated) from directly
-- executing complete_task_with_rewards. Only service_role and postgres
-- should have EXECUTE privilege.
--
-- Security Impact:
-- Before: Any browser/client could call complete_task_with_rewards directly
-- After: Only server-side code (via service_role) can execute the function
--
-- Affected Roles:
-- PUBLIC: EXECUTE removed
-- anon: EXECUTE removed
-- authenticated: EXECUTE removed
-- service_role: EXECUTE retained
-- postgres: EXECUTE retained

BEGIN;

-- Revoke EXECUTE from roles that could be used by browser/client
-- This prevents direct RPC calls from the Supabase JavaScript client
REVOKE EXECUTE ON FUNCTION public.complete_task_with_rewards(uuid, uuid)
FROM PUBLIC, anon, authenticated;

-- Verify the change (for documentation purposes only)
-- The following SELECT shows the remaining privileges:
-- SELECT grantee, privilege_type
-- FROM information_schema.role_routine_grants
-- WHERE routine_name = 'complete_task_with_rewards'
--   AND privilege_type = 'EXECUTE';
--
-- Expected result:
-- postgres: EXECUTE
-- service_role: EXECUTE

COMMIT;