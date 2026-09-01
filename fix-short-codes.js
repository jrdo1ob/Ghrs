const { Client } = require('pg')

function generateShortCode(name) {
  // Create a simple English-based code
  const codes = {
    'احمد': 'AHM',
    'شمه': 'SHM', 
    'عادل': 'ADL',
    'يوسف': 'YUS',
    'سارة': 'SAR',
    'محمد': 'MHD',
    'فاطمة': 'FAT',
    'علي': 'ALI',
    'خالد': 'KHD',
    'نورة': 'NOR',
  }
  
  const prefix = codes[name] || name.substring(0, 3).toUpperCase()
  const num = Math.floor(10 + Math.random() * 90)
  return `${prefix}${num}`
}

async function main() {
  const client = new Client({
    connectionString: 'postgresql://postgres:uH8+-88pqZeUn6n@db.xcbedqffmknlzjfpuwdr.supabase.co:5432/postgres',
    ssl: { rejectUnauthorized: false }
  })

  try {
    await client.connect()

    // Update short codes
    const members = await client.query('SELECT id, name FROM members')
    for (const m of members.rows) {
      const code = generateShortCode(m.name)
      await client.query(
        'UPDATE members SET short_code = $1 WHERE id = $2',
        [code, m.id]
      )
      console.log(`${m.name} → ${code}`)
    }

    // Show all members with their codes
    const all = await client.query('SELECT name, short_code, id FROM members')
    console.log('\nAll members:')
    all.rows.forEach(m => console.log(`  ${m.name}: ${m.short_code} (${m.id})`))

  } catch (e) {
    console.error('ERROR:', e.message)
  } finally {
    await client.end()
  }
}

main()
