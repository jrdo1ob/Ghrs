-- Migration 071: Revoke unused EXECUTE grants from PUBLIC, anon, authenticated
-- P0.1 remediation: remove unnecessary EXECUTE privileges on 19 SECURITY DEFINER functions
--
-- These 19 functions currently have EXECUTE granted to PUBLIC, anon, and authenticated.
-- The application exclusively uses the service-role client for all RPC calls.
-- No browser/client code calls these functions directly.
-- SECURITY DEFINER internal SQL-to-SQL calls are not affected (run as owner postgres).
-- pg_cron and event triggers are not affected (run as postgres).
--
-- IMPORTANT EXCEPTION: logout_member_session is EXCLUDED from this migration.
-- The logout route (src/app/api/auth/logout/route.ts) uses the server client (anon key),
-- not the service-role client. Revoking EXECUTE from anon would break logout.
-- Prerequisite: Change logout route to use createServiceRoleClient() before including
-- logout_member_session in a future REVOKE migration.
--
-- Source: Production catalog verification on xcbedqffmknlzjfpuwdr (PostgreSQL 17.6.1.166)
-- Verification: P0.1 ACL follow-up report (has_function_privilege confirmed)
-- Date: 2026-09-20

BEGIN;

-- 1. check_and_award_achievements(p_child_id uuid)
-- Called by: approve_task_completion (SECURITY DEFINER, runs as postgres)
-- No browser/client callers
REVOKE EXECUTE ON FUNCTION public.check_and_award_achievements(uuid)
  FROM PUBLIC, anon, authenticated;

-- 2. create_user_session(p_member_id uuid, p_pin text)
-- Legacy function, superseded by login_with_code_and_pin
-- No active callers
REVOKE EXECUTE ON FUNCTION public.create_user_session(uuid, text)
  FROM PUBLIC, anon, authenticated;

-- 3. get_available_tasks(p_family_id uuid, p_member_id uuid)
-- Legacy function, no active callers
REVOKE EXECUTE ON FUNCTION public.get_available_tasks(uuid, uuid)
  FROM PUBLIC, anon, authenticated;

-- 4. get_current_member()
-- Called by: RLS policies (run in DB session context, not via client EXECUTE)
-- Called by: other SECURITY DEFINER functions (run as postgres)
REVOKE EXECUTE ON FUNCTION public.get_current_member()
  FROM PUBLIC, anon, authenticated;

-- 5. get_current_member_id()
-- Called by: 30+ SECURITY DEFINER functions (run as postgres)
REVOKE EXECUTE ON FUNCTION public.get_current_member_id()
  FROM PUBLIC, anon, authenticated;

-- 6. get_current_member_info()
-- Legacy function, no active callers
REVOKE EXECUTE ON FUNCTION public.get_current_member_info()
  FROM PUBLIC, anon, authenticated;

-- 7. get_family_member_codes()
-- Legacy function, no active callers
REVOKE EXECUTE ON FUNCTION public.get_family_member_codes()
  FROM PUBLIC, anon, authenticated;

-- 8. is_family_member(target_family_id uuid)
-- Called by: RLS policies (run in DB session context, not via client EXECUTE)
REVOKE EXECUTE ON FUNCTION public.is_family_member(uuid)
  FROM PUBLIC, anon, authenticated;

-- 9. is_family_owner()
-- Called by: RLS policies (run in DB session context, not via client EXECUTE)
REVOKE EXECUTE ON FUNCTION public.is_family_owner()
  FROM PUBLIC, anon, authenticated;

-- 10. is_family_parent()
-- Called by: RLS policies (run in DB session context, not via client EXECUTE)
REVOKE EXECUTE ON FUNCTION public.is_family_parent()
  FROM PUBLIC, anon, authenticated;

-- 11. is_task_available(p_task_id uuid, p_member_id uuid)
-- Legacy function, called only by get_available_tasks (also legacy)
REVOKE EXECUTE ON FUNCTION public.is_task_available(uuid, uuid)
  FROM PUBLIC, anon, authenticated;

-- 12. link_auth_identity_to_member(p_member_id uuid, p_auth_user_id uuid, p_provider text)
-- Legacy function, no active callers
REVOKE EXECUTE ON FUNCTION public.link_auth_identity_to_member(uuid, uuid, text)
  FROM PUBLIC, anon, authenticated;

-- 13. logout_member_session(p_session_token text) -- EXCLUDED
-- NOTE: This function is excluded because the logout route uses the server client (anon key).
-- Prerequisite: Change src/app/api/auth/logout/route.ts to use createServiceRoleClient().
-- Then include this function in a future REVOKE migration.

-- 14. reset_weekly_grace_shields()
-- Called by: pg_cron (runs as postgres superuser)
REVOKE EXECUTE ON FUNCTION public.reset_weekly_grace_shields()
  FROM PUBLIC, anon, authenticated;

-- 15. rls_auto_enable()
-- Event trigger function (ddl_command_end), runs internally by PostgreSQL
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable()
  FROM PUBLIC, anon, authenticated;

-- 16. update_family_currency(p_family_id uuid, p_currency text)
-- Legacy function, no active callers
REVOKE EXECUTE ON FUNCTION public.update_family_currency(uuid, text)
  FROM PUBLIC, anon, authenticated;

-- 17. update_task(p_task_id uuid, p_title text, p_description text, p_xp_reward integer, p_money_reward numeric, p_frequency text, p_priority text, p_schedule_days integer[], p_assigned_to uuid[], p_requires_approval boolean, p_icon text)
-- Legacy function, application uses direct table updates via API routes
REVOKE EXECUTE ON FUNCTION public.update_task(uuid, text, text, integer, numeric, text, text, integer[], uuid[], boolean, text)
  FROM PUBLIC, anon, authenticated;

-- 18. validate_member_session(p_session_token text)
-- Called by: src/lib/auth/server-session.ts, src/lib/supabase/middleware.ts, src/app/api/tasks/complete/route.ts
-- All callers use service-role client
REVOKE EXECUTE ON FUNCTION public.validate_member_session(text)
  FROM PUBLIC, anon, authenticated;

-- 19. validate_session(p_session_token text)
-- Legacy function, superseded by validate_member_session
-- No active callers
REVOKE EXECUTE ON FUNCTION public.validate_session(text)
  FROM PUBLIC, anon, authenticated;

COMMIT;
