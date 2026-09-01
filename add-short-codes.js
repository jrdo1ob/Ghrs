const { Client } = require('pg')

function generateShortCode(name) {
  const clean = name.replace(/\s/g, '')
  const prefix = clean.substring(0, 3).toUpperCase()
  const num = Math.floor(10 + Math.random() * 90)
  return `${prefix}-${num}`
}

async function main() {
  const client = new Client({
    connectionString: 'postgresql://postgres:uH8+-88pqZeUn6n@db.xcbedqffmknlzjfpuwdr.supabase.co:5432/postgres',
    ssl: { rejectUnauthorized: false }
  })

  try {
    await client.connect()
    console.log('Connected!')

    // Add short_code column
    await client.query(`
      ALTER TABLE members ADD COLUMN IF NOT EXISTS short_code TEXT UNIQUE
    `)
    console.log('Column added!')

    // Generate short codes for existing members
    const members = await client.query('SELECT id, name FROM members')
    for (const m of members.rows) {
      const code = generateShortCode(m.name)
      await client.query(
        'UPDATE members SET short_code = $1 WHERE id = $2',
        [code, m.id]
      )
      console.log(`${m.name} → ${code}`)
    }

    console.log('\nAll short codes assigned!')

  } catch (e) {
    console.error('ERROR:', e.message)
  } finally {
    await client.end()
  }
}

main()
