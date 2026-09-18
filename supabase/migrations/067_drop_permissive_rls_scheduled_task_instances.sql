-- Migration 067: Drop permissive RLS policy on scheduled_task_instances
-- OPEN-5 remediation: defense-in-depth RLS hardening
--
-- The permissive "scheduled_task_instances_family" policy (FOR ALL USING true)
-- was created in migration 014. Migration 043 revoked DML from browser roles,
-- but the permissive RLS policy itself remained as a defense-in-depth gap.
--
-- This migration drops the permissive policy. With RLS still enabled and no
-- policy active, direct queries from any role are denied by default.
-- SECURITY DEFINER functions (generate_task_instances, complete_scheduled_instance)
-- bypass RLS and continue working. Service-role also bypasses RLS.
--
-- The table is not directly referenced by any application source code (src/).
-- All access goes through SECURITY DEFINER RPCs.

BEGIN;

DROP POLICY IF EXISTS "scheduled_task_instances_family" ON scheduled_task_instances;

COMMIT;
