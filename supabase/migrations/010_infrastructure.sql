-- Migration 010: Infrastructure — Soft Delete + Ledger Triggers + Centralized Gamification
-- Safe: ADD COLUMN only, no DROP, zero data loss

BEGIN;

-- ============================================================
-- 1. SOFT DELETE COLUMNS
-- ============================================================

-- Add is_deleted + deleted_at to main tables
ALTER TABLE families ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE families ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE members ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE members ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE gifts ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE gifts ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- ============================================================
-- 2. GAMIFICATION COLUMNS (for server-side streak tracking)
-- ============================================================

ALTER TABLE members ADD COLUMN IF NOT EXISTS current_streak INTEGER DEFAULT 0;
ALTER TABLE members ADD COLUMN IF NOT EXISTS longest_streak INTEGER DEFAULT 0;
ALTER TABLE members ADD COLUMN IF NOT EXISTS last_streak_date DATE;
ALTER TABLE members ADD COLUMN IF NOT EXISTS grace_shields INTEGER DEFAULT 3;
ALTER TABLE members ADD COLUMN IF NOT EXISTS last_active_date DATE;

-- ============================================================
-- 3. LEDGER PROTECTION TRIGGERS
-- ============================================================

-- Prevent UPDATE on xp_transactions
CREATE OR REPLACE FUNCTION prevent_ledger_update()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Cannot modify ledger records. Add a new transaction instead.';
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Prevent DELETE on xp_transactions
CREATE OR REPLACE FUNCTION prevent_ledger_delete()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Cannot delete ledger records. Add a new transaction instead.';
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers if they exist, then recreate
DROP TRIGGER IF EXISTS trg_xp_no_update ON xp_transactions;
CREATE TRIGGER trg_xp_no_update
  BEFORE UPDATE ON xp_transactions
  FOR EACH ROW EXECUTE FUNCTION prevent_ledger_update();

DROP TRIGGER IF EXISTS trg_xp_no_delete ON xp_transactions;
CREATE TRIGGER trg_xp_no_delete
  BEFORE DELETE ON xp_transactions
  FOR EACH ROW EXECUTE FUNCTION prevent_ledger_delete();

DROP TRIGGER IF EXISTS trg_money_no_update ON money_transactions;
CREATE TRIGGER trg_money_no_update
  BEFORE UPDATE ON money_transactions
  FOR EACH ROW EXECUTE FUNCTION prevent_ledger_update();

DROP TRIGGER IF EXISTS trg_money_no_delete ON money_transactions;
CREATE TRIGGER trg_money_no_delete
  BEFORE DELETE ON money_transactions
  FOR EACH ROW EXECUTE FUNCTION prevent_ledger_delete();

-- ============================================================
-- 4. INDEXES for soft delete queries
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_members_not_deleted ON members(family_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_tasks_not_deleted ON tasks(family_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_gifts_not_deleted ON gifts(family_id) WHERE is_deleted = FALSE;

COMMIT;
