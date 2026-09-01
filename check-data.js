const { Client } = require('pg')

async function main() {
  const client = new Client({
    connectionString: 'postgresql://postgres:uH8+-88pqZeUn6n@db.xcbedqffmknlzjfpuwdr.supabase.co:5432/postgres',
    ssl: { rejectUnauthorized: false }
  })

  try {
    await client.connect()

    // Show current families
    const families = await client.query('SELECT id, name, code FROM families')
    console.log('Current families:', families.rows)

    // Show current members
    const members = await client.query('SELECT id, family_id, name, role FROM members')
    console.log('Current members:', members.rows)

  } catch (e) {
    console.error('ERROR:', e.message)
  } finally {
    await client.end()
  }
}

main()
