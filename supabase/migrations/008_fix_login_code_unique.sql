-- ============================================
-- Fix 1: Make login_code globally unique
-- ============================================

-- First, check for and remove any duplicate login_codes
DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT login_code, COUNT(*) as cnt
    FROM members
    WHERE login_code IS NOT NULL
    GROUP BY login_code
    HAVING COUNT(*) > 1
  LOOP
    -- Set duplicate codes to NULL (except the first one)
    UPDATE members
    SET login_code = NULL
    WHERE id IN (
      SELECT id FROM members
      WHERE login_code = rec.login_code
      ORDER BY created_at
      LIMIT 1 OFFSET 1
    );
  END LOOP;
END $$;

-- Add unique constraint
DO $$ BEGIN
  ALTER TABLE members ADD CONSTRAINT unique_login_code UNIQUE (login_code);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Also add unique constraint on (family_id, login_code) for safety
DO $$ BEGIN
  ALTER TABLE members ADD CONSTRAINT unique_family_login_code UNIQUE (family_id, login_code);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
