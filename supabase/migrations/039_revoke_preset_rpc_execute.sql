-- ============================================================
-- Migration 039: Revoke direct browser execution of preset RPCs
-- ============================================================
-- PHASE 4.2 — Final preset-flow security boundary
--
-- The three preset write RPCs below are now invoked ONLY through
-- family-verified Server APIs (service-role), so the browser no
-- longer needs EXECUTE on them. Revoking from PUBLIC, anon and
-- authenticated closes the last direct-browser mutation surface
-- for preset flows while leaving the service-role client (server
-- APIs) fully able to execute them.
--
-- RPC bodies and signatures are NOT changed. No RLS changes.

BEGIN;

REVOKE EXECUTE ON FUNCTION add_preset_reward(uuid, uuid, integer, numeric)
FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION create_story(uuid, text, text, text, integer, uuid)
FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION add_preset_story(uuid, uuid, uuid)
FROM PUBLIC, anon, authenticated;

COMMIT;