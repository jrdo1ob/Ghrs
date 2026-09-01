const { Client } = require('pg')

async function main() {
  const client = new Client({
    connectionString: 'postgresql://postgres:uH8+-88pqZeUn6n@db.xcbedqffmknlzjfpuwdr.supabase.co:5432/postgres',
    ssl: { rejectUnauthorized: false }
  })

  try {
    await client.connect()

    // Check all members with login codes
    const members = await client.query(`
      SELECT m.name, m.login_code, m.id, m.role, f.code as family_code
      FROM members m
      JOIN families f ON f.id = m.family_id
    `)
    console.log('All members:')
    members.rows.forEach(m => console.log(`  ${m.name}: ${m.login_code} (${m.role})`))

    // Check if family_pins exist
    const pins = await client.query('SELECT member_id, pin_hash FROM family_pins')
    console.log('\nPins:', pins.rows.length, 'records')
    pins.rows.forEach(p => console.log(`  ${p.member_id}: ${p.pin_hash ? 'has pin' : 'NO PIN'}`))

    // Test the function directly
    console.log('\nTesting verify_member_pin...')
    try {
      const result = await client.query(`
        SELECT * FROM verify_member_pin('KXNZX2-101', '1234')
      `)
      console.log('Result:', result.rows)
    } catch (e) {
      console.log('Error:', e.message)
    }

  } catch (e) {
    console.error('ERROR:', e.message)
  } finally {
    await client.end()
  }
}

main()
