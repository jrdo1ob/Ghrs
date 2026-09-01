const { Client } = require('pg')

async function main() {
  const client = new Client({
    connectionString: 'postgresql://postgres:uH8+-88pqZeUn6n@db.xcbedqffmknlzjfpuwdr.supabase.co:5432/postgres',
    ssl: { rejectUnauthorized: false }
  })

  try {
    await client.connect()
    console.log('Connected!')

    // Enable Google provider in Supabase Auth
    await client.query(`
      INSERT INTO auth.providers (id, enabled) 
      VALUES ('google', true) 
      ON CONFLICT (id) DO UPDATE SET enabled = true;
    `)
    console.log('Google provider enabled!')

    // Add Google provider config
    await client.query(`
      INSERT INTO auth.provider_domains (provider_id, domain, allowed)
      VALUES ('google', 'accounts.google.com', true)
      ON CONFLICT DO NOTHING;
    `)
    console.log('Google domain configured!')

    console.log('Done! Now add the credentials in Supabase Dashboard.')

  } catch (e) {
    console.error('ERROR:', e.message)
    console.log('You may need to add the credentials manually in Supabase Dashboard.')
  } finally {
    await client.end()
  }
}

main()
