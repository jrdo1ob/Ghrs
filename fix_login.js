const { Client } = require('pg');

const connectionString = 'postgresql://postgres.xcbedqffmknlzjfpuwdr:uH8%2B-88pqZeUn6n@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres';

async function fix() {
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    console.log('✅ Connected\n');
    
    // 1. Drop ALL constraints and indexes on login_code
    console.log('🔧 Step 1: Removing ALL login_code constraints/indexes...');
    const constraints = await client.query(`
      SELECT conname FROM pg_constraint 
      WHERE conrelid = 'members'::regclass 
      AND conname LIKE '%login_code%'
    `);
    for (const c of constraints.rows) {
      await client.query(`ALTER TABLE members DROP CONSTRAINT IF EXISTS ${c.conname}`);
    }
    
    const indexes = await client.query(`
      SELECT indexname FROM pg_indexes 
      WHERE tablename = 'members' AND indexdef LIKE '%login_code%'
    `);
    for (const idx of indexes.rows) {
      await client.query(`DROP INDEX IF EXISTS ${idx.indexname}`);
    }
    console.log('  ✅ All removed');
    
    // 2. Set ALL login_codes to NULL first
    console.log('\n🔧 Step 2: Clearing all login codes...');
    await client.query('UPDATE members SET login_code = NULL');
    console.log('  ✅ Cleared');
    
    // 3. Assign codes per family
    console.log('\n🔧 Step 3: Assigning unique login codes...');
    const families = await client.query('SELECT id, code FROM families ORDER BY code');
    
    for (const fam of families.rows) {
      console.log(`\n  Family: ${fam.code}`);
      
      // Children first
      const children = await client.query(`
        SELECT id, name FROM members 
        WHERE family_id = $1 AND role = 'child' 
        ORDER BY created_at
      `, [fam.id]);
      
      for (let i = 0; i < children.rows.length; i++) {
        const code = `${fam.code}-100${i + 1}`;
        await client.query('UPDATE members SET login_code = $1 WHERE id = $2', [code, children.rows[i].id]);
        console.log(`    ${children.rows[i].name}: ${code}`);
      }
      
      // Parents/owners
      const parents = await client.query(`
        SELECT id, name FROM members 
        WHERE family_id = $1 AND role IN ('owner', 'parent') 
        ORDER BY created_at
      `, [fam.id]);
      
      for (let i = 0; i < parents.rows.length; i++) {
        const code = `${fam.code}-000${i + 1}`;
        await client.query('UPDATE members SET login_code = $1 WHERE id = $2', [code, parents.rows[i].id]);
        console.log(`    ${parents.rows[i].name}: ${code}`);
      }
    }
    
    // 4. Create unique index
    console.log('\n🔧 Step 4: Creating unique index...');
    await client.query('CREATE UNIQUE INDEX idx_members_login_code ON members(login_code) WHERE login_code IS NOT NULL');
    console.log('  ✅ Done');
    
    // 5. Set PINs to 1234 for all
    console.log('\n🔧 Step 5: Setting all PINs to 1234...');
    const hash = (await client.query("SELECT crypt('1234', gen_salt('bf')) as hash")).rows[0].hash;
    const allMembers = await client.query('SELECT id FROM members');
    
    for (const m of allMembers.rows) {
      await client.query('DELETE FROM family_pins WHERE member_id = $1', [m.id]);
      await client.query('INSERT INTO family_pins (member_id, pin_hash) VALUES ($1, $2)', [m.id, hash]);
      await client.query('UPDATE members SET pin_hash = $1 WHERE id = $2', [hash, m.id]);
    }
    console.log('  ✅ All PINs set');
    
    // 6. Test login
    console.log('\n🧪 Testing login:');
    const fresh = await client.query(`
      SELECT m.name, m.login_code, m.role, f.code as family_code
      FROM members m JOIN families f ON m.family_id = f.id
      ORDER BY f.code, m.role
    `);
    
    for (const m of fresh.rows) {
      const test = await client.query(`
        SELECT * FROM verify_member_pin(
          (SELECT id FROM members WHERE login_code = $1), 
          '1234'
        )
      `, [m.login_code]);
      
      console.log(`  ${test.rows.length > 0 ? '✅' : '❌'} ${m.login_code} | ${m.name} | ${test.rows.length > 0 ? test.rows[0].member_role : 'FAILED'}`);
    }
    
    console.log('\n🎉 All done!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

fix();
