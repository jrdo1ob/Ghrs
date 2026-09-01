-- Migration 016: Fix Family Login System
-- Fixes critical issues with login_code column, family_pins, and PIN verification

BEGIN;

-- ============================================================
-- 1. Add login_code column to members table (if missing)
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'members' AND column_name = 'login_code'
  ) THEN
    ALTER TABLE members ADD COLUMN login_code TEXT;
    RAISE NOTICE 'Added login_code column to members table';
  ELSE
    RAISE NOTICE 'login_code column already exists';
  END IF;
END $$;

-- Create unique index (safe to run multiple times)
CREATE UNIQUE INDEX IF NOT EXISTS idx_members_login_code 
ON members(login_code) WHERE login_code IS NOT NULL;

-- ============================================================
-- 2. Add UNIQUE constraint to family_pins (if missing)
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conrelid = 'family_pins'::regclass 
      AND contype = 'u'
      AND array_length(conkey, 1) = 1
  ) THEN
    -- First remove duplicates if any
    DELETE FROM family_pins a USING family_pins b
    WHERE a.id > b.id AND a.member_id = b.member_id;
    
    ALTER TABLE family_pins ADD CONSTRAINT family_pins_member_id_unique UNIQUE (member_id);
    RAISE NOTICE 'Added UNIQUE constraint to family_pins.member_id';
  ELSE
    RAISE NOTICE 'UNIQUE constraint already exists on family_pins.member_id';
  END IF;
END $$;

-- ============================================================
-- 3. Drop ALL existing verify_member_pin overloads
-- ============================================================

DROP FUNCTION IF EXISTS verify_member_pin(UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS verify_member_pin(TEXT, TEXT) CASCADE;

-- ============================================================
-- 4. Create clean verify_member_pin
-- ============================================================

CREATE OR REPLACE FUNCTION verify_member_pin(
  p_member_id UUID,
  p_pin TEXT
)
RETURNS TABLE(member_id UUID, member_name TEXT, member_role TEXT, family_id UUID) AS $$
DECLARE
  v_stored_hash TEXT;
  v_member RECORD;
BEGIN
  -- Get member info
  SELECT m.id, m.name, m.role, m.family_id, m.pin_hash
  INTO v_member
  FROM members m
  WHERE m.id = p_member_id;
  
  IF v_member IS NULL THEN
    RETURN;
  END IF;
  
  -- Get hash from family_pins first, fallback to members
  SELECT fp.pin_hash INTO v_stored_hash
  FROM family_pins fp
  WHERE fp.member_id = p_member_id;
  
  IF v_stored_hash IS NULL THEN
    v_stored_hash := v_member.pin_hash;
  END IF;
  
  IF v_stored_hash IS NULL THEN
    RETURN;
  END IF;
  
  -- Verify PIN
  IF v_stored_hash = crypt(p_pin, v_stored_hash) THEN
    member_id := v_member.id;
    member_name := v_member.name;
    member_role := v_member.role;
    family_id := v_member.family_id;
    RETURN NEXT;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 5. Drop ALL existing set_member_pin overloads
-- ============================================================

DROP FUNCTION IF EXISTS set_member_pin(UUID, TEXT) CASCADE;

-- ============================================================
-- 6. Create clean set_member_pin
-- ============================================================

CREATE OR REPLACE FUNCTION set_member_pin(
  p_member_id UUID,
  p_pin TEXT
)
RETURNS VOID AS $$
DECLARE
  v_hash TEXT;
BEGIN
  -- Compute hash once
  v_hash := crypt(p_pin, gen_salt('bf'));
  
  -- Upsert into family_pins
  INSERT INTO family_pins (member_id, pin_hash)
  VALUES (p_member_id, v_hash)
  ON CONFLICT (member_id) DO UPDATE
  SET pin_hash = v_hash;
  
  -- Also update members table
  UPDATE members
  SET pin_hash = v_hash
  WHERE id = p_member_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 7. Create generate_unique_login_code if not exists
-- ============================================================

CREATE OR REPLACE FUNCTION generate_unique_login_code(
  p_family_code TEXT,
  p_role TEXT
)
RETURNS TEXT AS $$
DECLARE
  v_prefix TEXT;
  v_count INTEGER;
  v_new_code TEXT;
  v_exists BOOLEAN;
BEGIN
  -- Prefix based on role
  IF p_role = 'child' THEN
    v_prefix := '100';
  ELSE
    v_prefix := '000';
  END IF;
  
  -- Get count of existing members with this role
  SELECT COUNT(*) INTO v_count
  FROM members m
  JOIN families f ON m.family_id = f.id
  WHERE f.code = p_family_code AND m.role = p_role;
  
  -- Generate code
  v_new_code := p_family_code || '-' || v_prefix || (v_count + 1);
  
  -- Check if exists (unlikely but safe)
  LOOP
    SELECT EXISTS(SELECT 1 FROM members WHERE login_code = v_new_code) INTO v_exists;
    EXIT WHEN NOT v_exists;
    v_count := v_count + 1;
    v_new_code := p_family_code || '-' || v_prefix || (v_count + 1);
  END LOOP;
  
  RETURN v_new_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 8. Generate login codes for existing members without one
-- ============================================================

DO $$
DECLARE
  v_member RECORD;
  v_family_code TEXT;
  v_new_code TEXT;
  v_counter INTEGER;
BEGIN
  FOR v_member IN 
    SELECT m.id, m.family_id, m.role, m.name, m.created_at, f.code as family_code
    FROM members m
    JOIN families f ON m.family_id = f.id
    WHERE m.login_code IS NULL
    ORDER BY m.created_at
  LOOP
    v_family_code := v_member.family_code;
    
    -- Count members with same role created before this one
    SELECT COUNT(*) INTO v_counter
    FROM members m2
    JOIN families f2 ON m2.family_id = f2.id
    WHERE m2.family_id = v_member.family_id 
      AND m2.role = v_member.role
      AND m2.created_at < v_member.created_at;
    
    v_counter := v_counter + 1;
    
    IF v_member.role = 'child' THEN
      v_new_code := v_family_code || '-100' || v_counter;
    ELSE
      v_new_code := v_family_code || '-000' || v_counter;
    END IF;
    
    -- Update with unique code
    UPDATE members SET login_code = v_new_code WHERE id = v_member.id;
  END LOOP;
END $$;

-- ============================================================
-- 9. Set PIN for existing members without one (default: 1234)
-- ============================================================

DO $$
DECLARE
  v_member RECORD;
  v_hash TEXT;
BEGIN
  v_hash := crypt('1234', gen_salt('bf'));
  
  FOR v_member IN
    SELECT m.id FROM members m
    LEFT JOIN family_pins fp ON m.id = fp.member_id
    WHERE fp.id IS NULL
  LOOP
    INSERT INTO family_pins (member_id, pin_hash)
    VALUES (v_member.id, v_hash)
    ON CONFLICT (member_id) DO NOTHING;
    
    UPDATE members SET pin_hash = v_hash WHERE id = v_member.id;
  END LOOP;
END $$;

-- ============================================================
-- 10. Ensure RLS allows all operations
-- ============================================================

-- members policies
ALTER TABLE members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "members_select_all" ON members;
CREATE POLICY "members_select_all" ON members FOR SELECT USING (true);

DROP POLICY IF EXISTS "members_insert_all" ON members;
CREATE POLICY "members_insert_all" ON members FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "members_update_all" ON members;
CREATE POLICY "members_update_all" ON members FOR UPDATE USING (true);

DROP POLICY IF EXISTS "members_delete_all" ON members;
CREATE POLICY "members_delete_all" ON members FOR DELETE USING (true);

-- family_pins policies
ALTER TABLE family_pins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "family_pins_select_all" ON family_pins;
CREATE POLICY "family_pins_select_all" ON family_pins FOR SELECT USING (true);

DROP POLICY IF EXISTS "family_pins_insert_all" ON family_pins;
CREATE POLICY "family_pins_insert_all" ON family_pins FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "family_pins_update_all" ON family_pins;
CREATE POLICY "family_pins_update_all" ON family_pins FOR UPDATE USING (true);

DROP POLICY IF EXISTS "family_pins_delete_all" ON family_pins;
CREATE POLICY "family_pins_delete_all" ON family_pins FOR DELETE USING (true);

COMMIT;
