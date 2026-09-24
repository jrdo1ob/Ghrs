-- Migration 079: Cleanup expired user sessions
-- F6 remediation: automated cleanup of expired rows from user_sessions
--
-- Problem: user_sessions contains expired rows that accumulate indefinitely.
-- Expired sessions are rejected server-side (validate_member_session requires
-- expires_at > NOW()), so this is a storage/operational hygiene gap, not an
-- authentication bypass.
--
-- Solution: Create a cleanup function and schedule it via pg_cron to
-- periodically delete expired rows. Follows the same pattern established
-- by migration 073 (cleanup_expired_rate_limits + hourly pg_cron).
--
-- Design:
--   - SECURITY DEFINER required: user_sessions has RLS with SELECT revoked
--     from anon/authenticated and INSERT/UPDATE/DELETE revoked from those
--     roles (migration 037/038). Direct DELETE requires elevated privileges.
--   - search_path = public, extensions per project standard.
--   - EXECUTE restricted to service_role only.
--   - pg_cron job runs as postgres superuser (bypasses RLS/privileges).
--   - Cleanup is idempotent: safe to run repeatedly.
--   - Deletes only rows where expires_at < now().
--   - Does not touch active sessions, NULL expires_at, or other tables.
--   - Schedule: daily at 03:00 UTC (conservative; 30-day TTL means daily is
--     more than sufficient). Off-peak for a Bahrain-family app.
--
-- Existing scheduled jobs (verified):
--   - reset-weekly-grace-shields: '0 0 * * 0' (weekly Sunday 00:00 UTC)
--   - cleanup-expired-rate-limits: '0 * * * *' (hourly)
--   No duplicate user_sessions cleanup job exists.

BEGIN;

-- ============================================================
-- 1. Cleanup function
-- ============================================================

CREATE OR REPLACE FUNCTION public.cleanup_expired_user_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  DELETE FROM public.user_sessions
  WHERE expires_at < now();
END;
$$;

-- ============================================================
-- 2. Restrict EXECUTE to service_role only
-- ============================================================

REVOKE EXECUTE ON FUNCTION public.cleanup_expired_user_sessions()
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.cleanup_expired_user_sessions()
  TO service_role;

-- ============================================================
-- 3. pg_cron: daily cleanup at 03:00 UTC (runs as postgres)
-- ============================================================

SELECT cron.schedule(
  'cleanup-expired-user-sessions',
  '0 3 * * *',
  'SELECT cleanup_expired_user_sessions()'
);

-- ============================================================
-- 4. Verify the job was created
-- ============================================================

SELECT jobname, schedule, command FROM cron.job
WHERE jobname = 'cleanup-expired-user-sessions';

COMMIT;
