const { Client } = require('pg')

async function main() {
  const client = new Client({
    connectionString: 'postgresql://postgres:uH8+-88pqZeUn6n@db.xcbedqffmknlzjfpuwdr.supabase.co:5432/postgres',
    ssl: { rejectUnauthorized: false }
  })

  try {
    await client.connect()
    console.log('Connected!')

    // Add login_code column to members
    await client.query(`
      ALTER TABLE members ADD COLUMN IF NOT EXISTS login_code TEXT UNIQUE
    `)
    console.log('Column added!')

    // Generate login codes for all children
    const families = await client.query('SELECT id, code FROM families')
    
    for (const family of families.rows) {
      const children = await client.query(
        'SELECT id, name FROM members WHERE family_id = $1 AND role = $2',
        [family.id, 'child']
      )
      
      let counter = 100
      for (const child of children.rows) {
        counter++
        const loginCode = `${family.code}-${counter}`
        await client.query(
          'UPDATE members SET login_code = $1 WHERE id = $2',
          [loginCode, child.id]
        )
        console.log(`${child.name} → ${loginCode}`)
      }
    }

    // Show all children with login codes
    const all = await client.query(`
      SELECT m.name, m.login_code, f.code as family_code 
      FROM members m 
      JOIN families f ON f.id = m.family_id 
      WHERE m.role = 'child'
    `)
    console.log('\nAll children:')
    all.rows.forEach(m => console.log(`  ${m.name}: ${m.login_code}`))

  } catch (e) {
    console.error('ERROR:', e.message)
  } finally {
    await client.end()
  }
}

main()
