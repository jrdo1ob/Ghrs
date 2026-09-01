const { Client } = require('pg')

async function main() {
  const client = new Client({
    connectionString: 'postgresql://postgres:uH8+-88pqZeUn6n@db.xcbedqffmknlzjfpuwdr.supabase.co:5432/postgres',
    ssl: { rejectUnauthorized: false }
  })

  try {
    await client.connect()
    console.log('Connected!')

    // Check auth config
    const config = await client.query(`
      SELECT * FROM auth.instances LIMIT 1
    `)
    console.log('Auth config:', JSON.stringify(config.rows, null, 2))

    // Check if google provider exists
    const providers = await client.query(`
      SELECT * FROM auth.providers
    `)
    console.log('Providers:', JSON.stringify(providers.rows, null, 2))

    // Check site_url
    const siteUrl = await client.query(`
      SELECT current_setting('app.settings.site_url', true) as site_url
    `)
    console.log('Site URL:', siteUrl.rows)

  } catch (e) {
    console.error('ERROR:', e.message)
  } finally {
    await client.end()
  }
}

main()
