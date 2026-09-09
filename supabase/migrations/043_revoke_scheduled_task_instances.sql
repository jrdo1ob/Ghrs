-- ============================================================
-- Migration 043: Revoke scheduled_task_instances from browser roles
-- ============================================================
-- PHASE 5 — Close the scheduled_task_instances isolation gap
--
-- scheduled_task_instances (014) is the only family-data table
-- missing from the 037 (DML) and 038 (SELECT) revoke lists, and its
-- two SECURITY DEFINER RPCs (generate_task_instances,
-- complete_scheduled_instance) were not in the 037 RPC revoke list.
-- The table is app-unused and never read/written by server APIs, so
-- revoking browser-role access closes the last permissive surface
-- for this table.
--
-- Revoking from PUBLIC, anon and authenticated does NOT affect the
-- service-role client used by server APIs, and changes no table
-- structure, columns, policies, function bodies, or other objects.
--
-- REVOKE is idempotent: revoking a privilege that was never granted
-- is a no-op, so the migration is safe to re-run.

BEGIN;

REVOKE SELECT, INSERT, UPDATE, DELETE
ON TABLE scheduled_task_instances
FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION generate_task_instances(uuid, date, date)
FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION complete_scheduled_instance(uuid, uuid)
FROM PUBLIC, anon, authenticated;

COMMIT;