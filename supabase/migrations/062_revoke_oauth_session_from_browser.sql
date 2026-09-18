-- Migration 062 (corrected): Revoke create_oauth_session EXECUTE from browser roles
-- P0-1 remediation: prevent anonymous/browser callers from creating sessions
-- for arbitrary members via the create_oauth_session RPC.
--
-- The only legitimate caller is /auth/callback (server-side route) which uses
-- the service-role client.
--
-- NOTE: REVOKE FROM PUBLIC also strips the default grant that service_role
-- relied on, so service_role MUST be re-granted explicitly or server calls
-- break too.

BEGIN;

REVOKE EXECUTE ON FUNCTION public.create_oauth_session(UUID)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.create_oauth_session(UUID)
TO service_role;

COMMIT;