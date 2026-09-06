const { Client } = require('pg')

async function main() {
  const client = new Client({
    connectionString: process.env.SUPABASE_DB_URL,
    ssl: { rejectUnauthorized: false }
  })

  try {
    await client.connect()
    console.log('Connected!')

    // Auto-confirm all unconfirmed users
    const r = await client.query(`
      UPDATE auth.users 
      SET email_confirmed_at = NOW() 
      WHERE email_confirmed_at IS NULL 
      RETURNING email
    `)
    console.log('Confirmed users:', r.rows)

    // List all users
    const r2 = await client.query('SELECT email, email_confirmed_at FROM auth.users')
    console.log('All users:', r2.rows)

  } catch (e) {
    console.error('ERROR:', e.message)
  } finally {
    await client.end()
  }
}

main()
