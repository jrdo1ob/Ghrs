-- ============================================================
-- Migration 048: Revoke reference table DML from browser roles
-- ============================================================
-- Reference tables are global read-only data. The browser only
-- needs SELECT. Revoking INSERT/UPDATE/DELETE from anon and
-- authenticated prevents unauthorized modifications.
--
-- Tables: achievement_definitions, preset_stories, preset_tasks,
--         reward_presets, surah_names
--
-- SELECT is preserved for public read access.
-- service_role is unaffected (server-side APIs).
-- ============================================================

BEGIN;

-- Revoke DML from browser roles on reference tables
REVOKE INSERT, UPDATE, DELETE ON TABLE achievement_definitions FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE preset_stories FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE preset_tasks FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE reward_presets FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE surah_names FROM anon, authenticated;

COMMIT;