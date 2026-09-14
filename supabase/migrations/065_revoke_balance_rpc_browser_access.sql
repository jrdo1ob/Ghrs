BEGIN;

-- P0 #4: Revoke browser-facing EXECUTE on balance/financial RPCs

REVOKE EXECUTE ON FUNCTION public.apply_manual_adjustment(uuid, text, text, numeric, text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_child_balance(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_child_full_balance(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.mark_money_pending_as_paid(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.mark_withdrawal_paid_with_transaction(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_child_streak(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_member_streak(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_member_streak(uuid, date) FROM PUBLIC, anon, authenticated;

-- Ensure service_role retains EXECUTE

GRANT EXECUTE ON FUNCTION public.apply_manual_adjustment(uuid, text, text, numeric, text, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_child_balance(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_child_full_balance(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.mark_money_pending_as_paid(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.mark_withdrawal_paid_with_transaction(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.update_child_streak(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.update_member_streak(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.update_member_streak(uuid, date) TO service_role;

COMMIT;
