-- Migration 070: Harden all remaining SECURITY DEFINER functions
-- M1 remediation: SET search_path on all unhardened SECURITY DEFINER functions
--
-- Scope: 49 application-owned functions (49 unhardened minus 0 platform exclusions)
--   rls_auto_enable() excluded: platform-owned, already hardened with search_path=pg_catalog
-- Strategy: ALTER FUNCTION ... SET search_path (preserves function body, behavior, ownership)
-- Target search_path: public, extensions (consistent with existing hardened functions)
--
-- Source: Production catalog verification on xcbedqffmknlzjfpuwdr (PostgreSQL 17.6.1.166)
-- Date: 2026-09-20

BEGIN;

-- 1. add_preset_reward(uuid, uuid, integer, numeric)
ALTER FUNCTION public.add_preset_reward(uuid, uuid, integer, numeric)
  SET search_path = public, extensions;

-- 2. add_preset_story(uuid, uuid, uuid)
ALTER FUNCTION public.add_preset_story(uuid, uuid, uuid)
  SET search_path = public, extensions;

-- 3. add_preset_task(uuid, uuid, uuid, integer, numeric)
ALTER FUNCTION public.add_preset_task(uuid, uuid, uuid, integer, numeric)
  SET search_path = public, extensions;

-- 4. add_preset_task(uuid, uuid, integer, numeric)
ALTER FUNCTION public.add_preset_task(uuid, uuid, integer, numeric)
  SET search_path = public, extensions;

-- 5. apply_manual_adjustment(uuid, text, text, integer, text)
ALTER FUNCTION public.apply_manual_adjustment(uuid, text, text, integer, text)
  SET search_path = public, extensions;

-- 6. apply_manual_adjustment(uuid, text, text, numeric, text, uuid)
ALTER FUNCTION public.apply_manual_adjustment(uuid, text, text, numeric, text, uuid)
  SET search_path = public, extensions;

-- 7. approve_gift_redemption(uuid)
ALTER FUNCTION public.approve_gift_redemption(uuid)
  SET search_path = public, extensions;

-- 8. approve_gift_redemption(uuid, uuid)
ALTER FUNCTION public.approve_gift_redemption(uuid, uuid)
  SET search_path = public, extensions;

-- 9. approve_task_completion(uuid, boolean, text)
ALTER FUNCTION public.approve_task_completion(uuid, boolean, text)
  SET search_path = public, extensions;

-- 10. check_and_award_achievements(uuid)
ALTER FUNCTION public.check_and_award_achievements(uuid)
  SET search_path = public, extensions;

-- 11. complete_scheduled_instance(uuid, uuid)
ALTER FUNCTION public.complete_scheduled_instance(uuid, uuid)
  SET search_path = public, extensions;

-- 12. complete_task_with_rewards(uuid, uuid)
ALTER FUNCTION public.complete_task_with_rewards(uuid, uuid)
  SET search_path = public, extensions;

-- 13. create_story(uuid, text, text, text, integer, uuid)
ALTER FUNCTION public.create_story(uuid, text, text, text, integer, uuid)
  SET search_path = public, extensions;

-- 14. create_user_session(uuid, text)
ALTER FUNCTION public.create_user_session(uuid, text)
  SET search_path = public, extensions;

-- 15. delete_story(uuid)
ALTER FUNCTION public.delete_story(uuid)
  SET search_path = public, extensions;

-- 16. delete_task(uuid)
ALTER FUNCTION public.delete_task(uuid)
  SET search_path = public, extensions;

-- 17. generate_task_instances(uuid, date, date)
ALTER FUNCTION public.generate_task_instances(uuid, date, date)
  SET search_path = public, extensions;

-- 18. generate_unique_login_code(text, text)
ALTER FUNCTION public.generate_unique_login_code(text, text)
  SET search_path = public, extensions;

-- 19. get_available_tasks(uuid, uuid)
ALTER FUNCTION public.get_available_tasks(uuid, uuid)
  SET search_path = public, extensions;

-- 20. get_child_balance(uuid)
ALTER FUNCTION public.get_child_balance(uuid)
  SET search_path = public, extensions;

-- 21. get_child_full_balance(uuid)
ALTER FUNCTION public.get_child_full_balance(uuid)
  SET search_path = public, extensions;

-- 22. get_current_member()
ALTER FUNCTION public.get_current_member()
  SET search_path = public, extensions;

-- 23. get_current_member_id()
ALTER FUNCTION public.get_current_member_id()
  SET search_path = public, extensions;

-- 24. get_current_member_info()
ALTER FUNCTION public.get_current_member_info()
  SET search_path = public, extensions;

-- 25. get_family_member_codes()
ALTER FUNCTION public.get_family_member_codes()
  SET search_path = public, extensions;

-- 26. is_family_member(uuid)
ALTER FUNCTION public.is_family_member(uuid)
  SET search_path = public, extensions;

-- 27. is_family_owner()
ALTER FUNCTION public.is_family_owner()
  SET search_path = public, extensions;

-- 28. is_family_parent()
ALTER FUNCTION public.is_family_parent()
  SET search_path = public, extensions;

-- 29. is_task_available(uuid, uuid)
ALTER FUNCTION public.is_task_available(uuid, uuid)
  SET search_path = public, extensions;

-- 30. link_auth_identity_to_member(uuid, uuid, text)
ALTER FUNCTION public.link_auth_identity_to_member(uuid, uuid, text)
  SET search_path = public, extensions;

-- 31. mark_money_pending_as_paid(uuid)
ALTER FUNCTION public.mark_money_pending_as_paid(uuid)
  SET search_path = public, extensions;

-- 32. mark_withdrawal_paid_with_transaction(uuid)
ALTER FUNCTION public.mark_withdrawal_paid_with_transaction(uuid)
  SET search_path = public, extensions;

-- 33. redeem_gift(uuid, uuid)
ALTER FUNCTION public.redeem_gift(uuid, uuid)
  SET search_path = public, extensions;

-- 34. reject_gift_redemption(uuid, text)
ALTER FUNCTION public.reject_gift_redemption(uuid, text)
  SET search_path = public, extensions;

-- 35. reject_gift_redemption(uuid, text, uuid)
ALTER FUNCTION public.reject_gift_redemption(uuid, text, uuid)
  SET search_path = public, extensions;

-- 36. reject_task_completion(uuid, uuid)
ALTER FUNCTION public.reject_task_completion(uuid, uuid)
  SET search_path = public, extensions;

-- 37. request_gift_redemption(uuid, uuid)
ALTER FUNCTION public.request_gift_redemption(uuid, uuid)
  SET search_path = public, extensions;

-- 38. request_gift_redemption(uuid, uuid, uuid)
ALTER FUNCTION public.request_gift_redemption(uuid, uuid, uuid)
  SET search_path = public, extensions;

-- 39. reset_weekly_grace_shields()
ALTER FUNCTION public.reset_weekly_grace_shields()
  SET search_path = public, extensions;

-- 40. revoke_gift_redemption(uuid, text, uuid)
ALTER FUNCTION public.revoke_gift_redemption(uuid, text, uuid)
  SET search_path = public, extensions;

-- 41. revoke_task_approval(uuid, text)
ALTER FUNCTION public.revoke_task_approval(uuid, text)
  SET search_path = public, extensions;

-- 42. set_member_pin(uuid, text)
ALTER FUNCTION public.set_member_pin(uuid, text)
  SET search_path = public, extensions;

-- 43. toggle_task_pause(uuid)
ALTER FUNCTION public.toggle_task_pause(uuid)
  SET search_path = public, extensions;

-- 44. update_child_streak(uuid)
ALTER FUNCTION public.update_child_streak(uuid)
  SET search_path = public, extensions;

-- 45. update_family_currency(uuid, text)
ALTER FUNCTION public.update_family_currency(uuid, text)
  SET search_path = public, extensions;

-- 46. update_member_streak(uuid)
ALTER FUNCTION public.update_member_streak(uuid)
  SET search_path = public, extensions;

-- 47. update_member_streak(uuid, date)
ALTER FUNCTION public.update_member_streak(uuid, date)
  SET search_path = public, extensions;

-- 48. update_task(uuid, text, text, integer, numeric, text, text, integer[], uuid[], boolean, text)
ALTER FUNCTION public.update_task(uuid, text, text, integer, numeric, text, text, integer[], uuid[], boolean, text)
  SET search_path = public, extensions;

-- 49. validate_session(text)
ALTER FUNCTION public.validate_session(text)
  SET search_path = public, extensions;

COMMIT;
