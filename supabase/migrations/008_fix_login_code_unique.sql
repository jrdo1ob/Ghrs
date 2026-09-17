-- ============================================
-- Fix 1: Make login_code globally unique
-- ============================================
-- Guard: login_code column is added in migration 016.
-- On a fresh database before 016, skip this migration's logic entirely.
-- On a database where login_code already exists, execute normally.

DO $$
BEGIN
  -- Check if login_code column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'members' AND column_name = 'login_code'
  ) THEN
    RAISE NOTICE '008: login_code column does not yet exist — skipping duplicate cleanup and constraints';
    RETURN;
  END IF;

  -- login_code exists — proceed with duplicate cleanup

  -- First, check for and remove any duplicate login_codes
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
  END;

  -- Add unique constraint
  BEGIN
    ALTER TABLE members ADD CONSTRAINT unique_login_code UNIQUE (login_code);
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  -- Also add unique constraint on (family_id, login_code) for safety
  BEGIN
    ALTER TABLE members ADD CONSTRAINT unique_family_login_code UNIQUE (family_id, login_code);
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

END $$;
