const { Client } = require('pg')

async function main() {
  const client = new Client({
    connectionString: 'postgresql://postgres:uH8+-88pqZeUn6n@db.xcbedqffmknlzjfpuwdr.supabase.co:5432/postgres',
    ssl: { rejectUnauthorized: false }
  })

  try {
    await client.connect()
    console.log('Connected!')

    // Update Site URL to Vercel deployment
    await client.query(`
      UPDATE auth.config 
      SET site_url = 'https://ghrs-cyan.vercel.app'
    `)
    console.log('Site URL updated!')

    // Add redirect URLs
    await client.query(`
      INSERT INTO auth.redirect_urls (redirect_url)
      VALUES 
        ('https://ghrs-cyan.vercel.app'),
        ('https://ghrs-cyan.vercel.app/auth/callback'),
        ('https://ghrs-cyan.vercel.app/dashboard'),
        ('https://ghrs-cyan.vercel.app/family-setup')
      ON CONFLICT DO NOTHING;
    `)
    console.log('Redirect URLs added!')

    // Verify
    const r = await client.query('SELECT site_url FROM auth.config')
    console.log('Current Site URL:', r.rows)

  } catch (e) {
    console.error('ERROR:', e.message)
  } finally {
    await client.end()
  }
}

main()
