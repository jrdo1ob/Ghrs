-- Test script for family login system
-- Run this AFTER migration 016 to verify everything works

-- 1. Check if login_code column exists
SELECT 
  column_name, 
  data_type 
FROM information_schema.columns 
WHERE table_name = 'members' AND column_name = 'login_code';

-- 2. Check if family_pins has UNIQUE constraint
SELECT 
  conname, 
  contype 
FROM pg_constraint 
WHERE conrelid = 'family_pins'::regclass AND contype = 'u';

-- 3. Check all members have login_code
SELECT 
  m.name, 
  m.role, 
  m.login_code,
  f.code as family_code
FROM members m
JOIN families f ON m.family_id = f.id
ORDER BY f.code, m.role, m.name;

-- 4. Check all members have PIN
SELECT 
  m.name,
  CASE WHEN fp.id IS NULL THEN 'NO PIN' ELSE 'HAS PIN' END as pin_status
FROM members m
LEFT JOIN family_pins fp ON m.id = fp.member_id;

-- 5. Test verify_member_pin (replace with actual member_id)
-- SELECT * FROM verify_member_pin('MEMBER_ID_HERE', '1234');

-- 6. Check RPC exists
SELECT 
  p.proname, 
  pg_get_function_arguments(p.oid) as arguments
FROM pg_proc p
WHERE p.proname IN ('verify_member_pin', 'set_member_pin', 'generate_unique_login_code');
