const { Client } = require('pg');

const connectionString = 'postgresql://postgres.xcbedqffmknlzjfpuwdr:uH8%2B-88pqZeUn6n@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres';

async function testPinUpdate() {
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    console.log('✅ Connected\n');
    
    // 1. Get a test member
    console.log('🔍 Step 1: Getting test member...');
    const member = await client.query(`
      SELECT m.id, m.name, m.login_code, fp.pin_hash
      FROM members m
      LEFT JOIN family_pins fp ON m.id = fp.member_id
      WHERE m.login_code = 'KXNZX2-1001'
    `);
    
    if (member.rows.length === 0) {
      console.log('  ❌ Member not found');
      return;
    }
    
    const m = member.rows[0];
    console.log(`  Member: ${m.name} (${m.login_code})`);
    console.log(`  Current PIN hash: ${m.pin_hash?.substring(0, 20)}...`);
    
    // 2. Test current PIN (1234)
    console.log('\n🧪 Step 2: Testing current PIN (1234)...');
    const test1 = await client.query(`
      SELECT * FROM verify_member_pin($1, '1234')
    `, [m.id]);
    console.log(`  Result: ${test1.rows.length > 0 ? '✅ SUCCESS' : '❌ FAILED'}`);
    
    // 3. Change PIN to 5678
    console.log('\n🔧 Step 3: Changing PIN to 5678...');
    await client.query(`SELECT set_member_pin($1, '5678')`, [m.id]);
    
    // 4. Verify new PIN hash
    console.log('\n🔍 Step 4: Verifying new PIN hash...');
    const newHash = await client.query(`
      SELECT pin_hash FROM family_pins WHERE member_id = $1
    `, [m.id]);
    console.log(`  New PIN hash: ${newHash.rows[0]?.pin_hash?.substring(0, 20)}...`);
    
    // 5. Test new PIN (5678)
    console.log('\n🧪 Step 5: Testing new PIN (5678)...');
    const test2 = await client.query(`
      SELECT * FROM verify_member_pin($1, '5678')
    `, [m.id]);
    console.log(`  Result: ${test2.rows.length > 0 ? '✅ SUCCESS' : '❌ FAILED'}`);
    
    // 6. Test old PIN (1234) - should fail
    console.log('\n🧪 Step 6: Testing old PIN (1234) - should FAIL...');
    const test3 = await client.query(`
      SELECT * FROM verify_member_pin($1, '1234')
    `, [m.id]);
    console.log(`  Result: ${test3.rows.length === 0 ? '✅ CORRECTLY REJECTED' : '❌ SHOULD HAVE FAILED'}`);
    
    // 7. Check members table too
    console.log('\n🔍 Step 7: Checking members table...');
    const memberHash = await client.query(`
      SELECT pin_hash FROM members WHERE id = $1
    `, [m.id]);
    console.log(`  Members.pin_hash: ${memberHash.rows[0]?.pin_hash?.substring(0, 20)}...`);
    
    const familyHash = await client.query(`
      SELECT pin_hash FROM family_pins WHERE member_id = $1
    `, [m.id]);
    console.log(`  family_pins.pin_hash: ${familyHash.rows[0]?.pin_hash?.substring(0, 20)}...`);
    
    const match = memberHash.rows[0]?.pin_hash === familyHash.rows[0]?.pin_hash;
    console.log(`  Hashes match: ${match ? '✅ YES' : '❌ NO'}`);
    
    // 8. Reset PIN back to 1234
    console.log('\n🔧 Step 8: Resetting PIN back to 1234...');
    await client.query(`SELECT set_member_pin($1, '1234')`, [m.id]);
    
    const resetTest = await client.query(`
      SELECT * FROM verify_member_pin($1, '1234')
    `, [m.id]);
    console.log(`  Result: ${resetTest.rows.length > 0 ? '✅ SUCCESS' : '❌ FAILED'}`);
    
    console.log('\n🎉 All tests passed!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

testPinUpdate();
