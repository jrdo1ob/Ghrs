const { Client } = require('pg')

async function main() {
  const client = new Client({
    connectionString: 'postgresql://postgres:uH8+-88pqZeUn6n@db.xcbedqffmknlzjfpuwdr.supabase.co:5432/postgres',
    ssl: { rejectUnauthorized: false }
  })

  try {
    await client.connect()

    // Update family name
    await client.query(`
      UPDATE families SET name = 'غرس' WHERE id = '63dcfa6f-88cb-49fe-8c6f-aa2807be9839'
    `)
    console.log('Family name updated to غرس!')

    // Delete the empty family
    await client.query(`
      DELETE FROM families WHERE id = '4bc18f84-3312-45d7-811a-5891eebfd23f'
    `)
    console.log('Empty family deleted!')

    // Verify
    const r = await client.query('SELECT id, name, code FROM families')
    console.log('Updated families:', r.rows)

  } catch (e) {
    console.error('ERROR:', e.message)
  } finally {
    await client.end()
  }
}

main()
