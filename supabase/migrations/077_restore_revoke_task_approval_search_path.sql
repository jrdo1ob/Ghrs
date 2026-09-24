-- Migration 077: Restore search_path on revoke_task_approval
-- F1 remediation: restore SET search_path that was silently stripped by migration 075
--
-- Root cause: Migration 075 used CREATE OR REPLACE FUNCTION to update
-- revoke_task_approval with BHD money reversal logic. CREATE OR REPLACE
-- replaces the entire function definition including configuration attributes,
-- which silently removed the SET search_path = public, extensions hardening
-- that was applied in migration 070.
--
-- Fix: Reapply the search_path configuration using ALTER FUNCTION (same
-- strategy as migration 070). This preserves the function body, ownership,
-- SECURITY DEFINER attribute, and all existing behavior.
--
-- The function references only public-schema objects (task_completions, tasks,
-- members, xp_transactions, money_transactions, task_approval_history tables
-- and get_current_member_id() function). The extensions schema is included
-- for consistency with the project standard (migration 070 target:
-- SET search_path = public, extensions).

BEGIN;

ALTER FUNCTION public.revoke_task_approval(uuid, text)
  SET search_path = public, extensions;

COMMIT;
