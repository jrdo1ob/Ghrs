-- Migration 073: Durable rate limiting for auth endpoints
-- P0.2 remediation: database-backed rate limiting for member-login, OAuth callback, family-setup
--
-- Changes:
-- 1. CREATE TABLE rate_limits — durable fixed-window rate limit storage
-- 2. CREATE FUNCTION check_rate_limit — atomic increment/check, SECURITY INVOKER
-- 3. CREATE FUNCTION cleanup_expired_rate_limits — hourly pg_cron job
-- 4. Table RLS + GRANT: browser roles blocked, service_role only
-- 5. Function EXECUTE: service_role only
-- 6. pg_cron: hourly cleanup of expired windows
--
-- Design notes:
--   - Scope includes window size (e.g. 'member-login:300s') to prevent collisions
--     between different window configurations using the same logical scope.
--   - SECURITY INVOKER (not DEFINER): function runs as service_role caller,
--     which already has the necessary table privileges. No privilege escalation.
--   - Fixed-window: boundary burst is acceptable for P0.2 threat model.
--   - Fail-closed: if check_rate_limit throws, the calling route must return 503.
--   - Cleanup retains 2 hours of history (covers the longest window: 3600s = 1h).

BEGIN;

-- ============================================================
-- 1. Rate limits table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.rate_limits (
  scope       TEXT        NOT NULL,
  key         TEXT        NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  count       INTEGER     NOT NULL DEFAULT 1,
  expires_at  TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (scope, key, window_start)
);

COMMENT ON TABLE public.rate_limits IS 'P0.2 durable fixed-window rate limiting. Scope encodes window size (e.g. member-login:300s).';

CREATE INDEX IF NOT EXISTS idx_rate_limits_expires
  ON public.rate_limits (expires_at);

-- ============================================================
-- 2. RLS: block browser roles, allow service_role
-- ============================================================

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY rate_limits_service_only ON public.rate_limits
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- 3. Table grants: browser roles get nothing
-- ============================================================

REVOKE ALL ON public.rate_limits FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rate_limits TO service_role;

-- ============================================================
-- 4. Atomic rate limit check function
-- ============================================================

CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_scope TEXT,
  p_key TEXT,
  p_window_seconds INTEGER,
  p_max_attempts INTEGER
)
RETURNS TABLE(allowed BOOLEAN, retry_after INTEGER)
LANGUAGE plpgsql
SET search_path = public, extensions
AS $$
DECLARE
  v_window_start TIMESTAMPTZ;
  v_expires_at TIMESTAMPTZ;
  v_count INTEGER;
  v_remaining INTEGER;
BEGIN
  -- Input validation
  IF p_scope IS NULL OR btrim(p_scope) = '' THEN
    RAISE EXCEPTION 'rate_limit: scope must not be empty';
  END IF;

  IF p_key IS NULL OR btrim(p_key) = '' THEN
    RAISE EXCEPTION 'rate_limit: key must not be empty';
  END IF;

  IF length(p_key) > 255 THEN
    RAISE EXCEPTION 'rate_limit: key must not exceed 255 characters';
  END IF;

  IF p_window_seconds IS NULL OR p_window_seconds <= 0 THEN
    RAISE EXCEPTION 'rate_limit: window_seconds must be a positive integer';
  END IF;

  IF p_max_attempts IS NULL OR p_max_attempts <= 0 THEN
    RAISE EXCEPTION 'rate_limit: max_attempts must be a positive integer';
  END IF;

  -- Deterministic fixed window aligned to Unix epoch
  v_window_start := to_timestamp(
    floor(extract(epoch FROM now()) / p_window_seconds) * p_window_seconds
  );
  v_expires_at := v_window_start + (p_window_seconds || ' seconds')::interval;

  -- Atomic insert-or-increment: concurrent requests serialize on the PK
  BEGIN
    INSERT INTO public.rate_limits (scope, key, window_start, count, expires_at)
    VALUES (p_scope, p_key, v_window_start, 1, v_expires_at);
  EXCEPTION WHEN unique_violation THEN
    UPDATE public.rate_limits
    SET count = count + 1
    WHERE scope = p_scope
      AND key = p_key
      AND window_start = v_window_start;
  END;

  -- Read the post-increment count
  SELECT rl.count INTO v_count
  FROM public.rate_limits rl
  WHERE rl.scope = p_scope
    AND rl.key = p_key
    AND rl.window_start = v_window_start;

  IF v_count > p_max_attempts THEN
    v_remaining := p_window_seconds
      - (floor(extract(epoch FROM now()))::bigint
         - floor(extract(epoch FROM v_window_start))::bigint)::integer;
    IF v_remaining < 0 THEN
      v_remaining := 0;
    END IF;
    RETURN QUERY SELECT FALSE, v_remaining;
  ELSE
    RETURN QUERY SELECT TRUE, 0;
  END IF;
END;
$$;

-- ============================================================
-- 5. Function grants: service_role only
-- ============================================================

REVOKE EXECUTE ON FUNCTION public.check_rate_limit(text, text, integer, integer)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.check_rate_limit(text, text, integer, integer)
  TO service_role;

-- ============================================================
-- 6. Cleanup function for expired windows
-- ============================================================

CREATE OR REPLACE FUNCTION public.cleanup_expired_rate_limits()
RETURNS void
LANGUAGE plpgsql
SET search_path = public, extensions
AS $$
BEGIN
  DELETE FROM public.rate_limits
  WHERE expires_at < now() - INTERVAL '1 hour';
END;
$$;

REVOKE EXECUTE ON FUNCTION public.cleanup_expired_rate_limits()
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.cleanup_expired_rate_limits()
  TO service_role;

-- ============================================================
-- 7. pg_cron: hourly cleanup (runs as postgres superuser)
-- ============================================================

SELECT cron.schedule(
  'cleanup-expired-rate-limits',
  '0 * * * *',
  'SELECT cleanup_expired_rate_limits()'
);

COMMIT;
