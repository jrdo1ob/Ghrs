const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const connectionString = 'postgresql://postgres.xcbedqffmknlzjfpuwdr:uH8%2B-88pqZeUn6n@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres';

async function runMigration() {
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    console.log('✅ Connected to Supabase database');
    
    // Step 1: Check if login_code column exists
    console.log('\n🔍 Step 1: Checking login_code column...');
    const columnCheck = await client.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'members' AND column_name = 'login_code'
    `);
    
    if (columnCheck.rows.length === 0) {
      console.log('  Adding login_code column...');
      await client.query('ALTER TABLE members ADD COLUMN login_code TEXT');
      console.log('  ✅ Column added');
    } else {
      console.log('  ✅ Column already exists');
    }
    
    // Step 2: Fix duplicate login_codes BEFORE adding unique index
    console.log('\n🔍 Step 2: Fixing duplicate login_codes...');
    const duplicates = await client.query(`
      SELECT login_code, COUNT(*) as cnt
      FROM members
      WHERE login_code IS NOT NULL
      GROUP BY login_code
      HAVING COUNT(*) > 1
    `);
    
    if (duplicates.rows.length > 0) {
      console.log(`  Found ${duplicates.rows.length} duplicate codes. Fixing...`);
      
      // For each duplicate, regenerate codes
      for (const dup of duplicates.rows) {
        console.log(`  Fixing duplicate: ${dup.login_code}`);
        
        // Get all members with this login_code
        const members = await client.query(`
          SELECT m.id, m.role, f.code as family_code
          FROM members m
          JOIN families f ON m.family_id = f.id
          WHERE m.login_code = $1
          ORDER BY m.created_at
        `, [dup.login_code]);
        
        // Reassign codes
        let counter = 1;
        for (const member of members.rows) {
          const prefix = member.role === 'child' ? '100' : '000';
          const newCode = `${member.family_code}-${prefix}${counter}`;
          await client.query('UPDATE members SET login_code = $1 WHERE id = $2', [newCode, member.id]);
          console.log(`    ${member.id}: ${dup.login_code} → ${newCode}`);
          counter++;
        }
      }
    } else {
      console.log('  ✅ No duplicates found');
    }
    
    // Step 3: Create unique index (safe)
    console.log('\n🔍 Step 3: Creating unique index on login_code...');
    await client.query('CREATE UNIQUE INDEX IF NOT EXISTS idx_members_login_code ON members(login_code) WHERE login_code IS NOT NULL');
    console.log('  ✅ Index created');
    
    // Step 4: Fix family_pins UNIQUE constraint
    console.log('\n🔍 Step 4: Fixing family_pins UNIQUE constraint...');
    const constraintCheck = await client.query(`
      SELECT conname FROM pg_constraint 
      WHERE conrelid = 'family_pins'::regclass AND contype = 'u'
    `);
    
    if (constraintCheck.rows.length === 0) {
      // Remove duplicates first
      await client.query(`
        DELETE FROM family_pins a USING family_pins b
        WHERE a.id > b.id AND a.member_id = b.member_id
      `);
      await client.query('ALTER TABLE family_pins ADD CONSTRAINT family_pins_member_id_unique UNIQUE (member_id)');
      console.log('  ✅ UNIQUE constraint added');
    } else {
      console.log('  ✅ UNIQUE constraint already exists');
    }
    
    // Step 5: Fix verify_member_pin
    console.log('\n🔍 Step 5: Fixing verify_member_pin...');
    await client.query('DROP FUNCTION IF EXISTS verify_member_pin(UUID, TEXT) CASCADE');
    await client.query('DROP FUNCTION IF EXISTS verify_member_pin(TEXT, TEXT) CASCADE');
    
    await client.query(`
      CREATE OR REPLACE FUNCTION verify_member_pin(
        p_member_id UUID,
        p_pin TEXT
      )
      RETURNS TABLE(member_id UUID, member_name TEXT, member_role TEXT, family_id UUID) AS $$
      DECLARE
        v_stored_hash TEXT;
        v_member RECORD;
      BEGIN
        SELECT m.id, m.name, m.role, m.family_id, m.pin_hash
        INTO v_member
        FROM members m
        WHERE m.id = p_member_id;
        
        IF v_member IS NULL THEN
          RETURN;
        END IF;
        
        SELECT fp.pin_hash INTO v_stored_hash
        FROM family_pins fp
        WHERE fp.member_id = p_member_id;
        
        IF v_stored_hash IS NULL THEN
          v_stored_hash := v_member.pin_hash;
        END IF;
        
        IF v_stored_hash IS NULL THEN
          RETURN;
        END IF;
        
        IF v_stored_hash = crypt(p_pin, v_stored_hash) THEN
          member_id := v_member.id;
          member_name := v_member.name;
          member_role := v_member.role;
          family_id := v_member.family_id;
          RETURN NEXT;
        END IF;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `);
    console.log('  ✅ verify_member_pin fixed');
    
    // Step 6: Fix set_member_pin
    console.log('\n🔍 Step 6: Fixing set_member_pin...');
    await client.query('DROP FUNCTION IF EXISTS set_member_pin(UUID, TEXT) CASCADE');
    
    await client.query(`
      CREATE OR REPLACE FUNCTION set_member_pin(
        p_member_id UUID,
        p_pin TEXT
      )
      RETURNS VOID AS $$
      DECLARE
        v_hash TEXT;
      BEGIN
        v_hash := crypt(p_pin, gen_salt('bf'));
        
        INSERT INTO family_pins (member_id, pin_hash)
        VALUES (p_member_id, v_hash)
        ON CONFLICT (member_id) DO UPDATE
        SET pin_hash = v_hash;
        
        UPDATE members
        SET pin_hash = v_hash
        WHERE id = p_member_id;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `);
    console.log('  ✅ set_member_pin fixed');
    
    // Step 7: Fix generate_unique_login_code
    console.log('\n🔍 Step 7: Creating generate_unique_login_code...');
    await client.query(`
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
        IF p_role = 'child' THEN
          v_prefix := '100';
        ELSE
          v_prefix := '000';
        END IF;
        
        SELECT COUNT(*) INTO v_count
        FROM members m
        JOIN families f ON m.family_id = f.id
        WHERE f.code = p_family_code AND m.role = p_role;
        
        v_new_code := p_family_code || '-' || v_prefix || (v_count + 1);
        
        LOOP
          SELECT EXISTS(SELECT 1 FROM members WHERE login_code = v_new_code) INTO v_exists;
          EXIT WHEN NOT v_exists;
          v_count := v_count + 1;
          v_new_code := p_family_code || '-' || v_prefix || (v_count + 1);
        END LOOP;
        
        RETURN v_new_code;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `);
    console.log('  ✅ generate_unique_login_code created');
    
    // Step 8: Set default PIN for members without one
    console.log('\n🔍 Step 8: Setting default PIN for members without one...');
    const noPin = await client.query(`
      SELECT m.id, m.name FROM members m
      LEFT JOIN family_pins fp ON m.id = fp.member_id
      WHERE fp.id IS NULL
    `);
    
    if (noPin.rows.length > 0) {
      const hash = (await client.query("SELECT crypt('1234', gen_salt('bf')) as hash")).rows[0].hash;
      
      for (const member of noPin.rows) {
        await client.query('INSERT INTO family_pins (member_id, pin_hash) VALUES ($1, $2) ON CONFLICT (member_id) DO NOTHING', [member.id, hash]);
        await client.query('UPDATE members SET pin_hash = $1 WHERE id = $2', [hash, member.id]);
        console.log(`  Set PIN for ${member.name}`);
      }
    } else {
      console.log('  ✅ All members have PINs');
    }
    
    // Step 9: Verify everything
    console.log('\n📋 Step 9: Final verification...');
    
    const members = await client.query(`
      SELECT m.name, m.role, m.login_code, f.code as family_code
      FROM members m
      JOIN families f ON m.family_id = f.id
      ORDER BY f.code, m.role, m.name
    `);
    
    console.log('\n👥 Members:');
    for (const m of members.rows) {
      const pinCheck = await client.query('SELECT * FROM family_pins WHERE member_id = (SELECT id FROM members WHERE login_code = $1)', [m.login_code]);
      const pinStatus = pinCheck.rows.length > 0 ? '✅' : '❌';
      console.log(`  ${m.family_code} | ${m.name} (${m.role}) | Code: ${m.login_code} | PIN: ${pinStatus}`);
    }
    
    // Test login
    if (members.rows.length > 0) {
      const testMember = members.rows[0];
      console.log(`\n🧪 Testing login for ${testMember.name}...`);
      const loginTest = await client.query(`
        SELECT * FROM verify_member_pin(
          (SELECT id FROM members WHERE login_code = $1), 
          '1234'
        )
      `, [testMember.login_code]);
      
      if (loginTest.rows.length > 0) {
        console.log('  ✅ Login TEST PASSED!');
        console.log(`  Name: ${loginTest.rows[0].member_name}`);
        console.log(`  Role: ${loginTest.rows[0].member_role}`);
      } else {
        console.log('  ❌ Login TEST FAILED');
      }
    }
    
    console.log('\n🎉 Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Details:', error.detail);
  } finally {
    await client.end();
  }
}

runMigration();
