-- ============================================================
-- Migration 061: Revoke unrevoked gift RPC overloads
-- ============================================================
-- FIXES:
-- 1. REVOKE request_gift_redemption(uuid, uuid, uuid) from browser roles
--    (added by migration 060 but not covered by 059's REVOKE)
-- 2. REVOKE redeem_gift(uuid, uuid) from browser roles
--    (legacy function from migration 006/054, never revoked)
-- ============================================================

BEGIN;

-- 1. Revoke the NEW overload added by migration 060
--    Migration 059 only revoked (uuid, uuid), not (uuid, uuid, uuid)
REVOKE EXECUTE ON FUNCTION request_gift_redemption(uuid, uuid, uuid) FROM PUBLIC, anon, authenticated;

-- 2. Revoke the legacy redeem_gift function
--    This old function name was never revoked; it skips NULL caller auth
REVOKE EXECUTE ON FUNCTION redeem_gift(uuid, uuid) FROM PUBLIC, anon, authenticated;

COMMIT;
