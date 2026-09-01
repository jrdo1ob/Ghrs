const { Client } = require('pg')

async function main() {
  const client = new Client({
    connectionString: 'postgresql://postgres:uH8+-88pqZeUn6n@db.xcbedqffmknlzjfpuwdr.supabase.co:5432/postgres',
    ssl: { rejectUnauthorized: false }
  })

  try {
    await client.connect()

    // Set PIN for علي
    const ali = await client.query(`SELECT id FROM members WHERE login_code = 'KXNZX2-101'`)
    if (ali.rows.length > 0) {
      const aliId = ali.rows[0].id
      await client.query(`
        UPDATE members SET pin_hash = crypt('1234', gen_salt('bf')) WHERE id = $1
      `, [aliId])
      console.log('PIN set for علي: 1234')
    }

    // Test again
    try {
      const result = await client.query(`SELECT * FROM verify_member_pin('KXNZX2-101', '1234')`)
      console.log('Test result:', result.rows)
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
