const { Client } = require('pg')

async function main() {
  const client = new Client({
    connectionString: 'postgresql://postgres:uH8+-88pqZeUn6n@db.xcbedqffmknlzjfpuwdr.supabase.co:5432/postgres',
    ssl: { rejectUnauthorized: false }
  })

  try {
    await client.connect()

    // Add DELETE policy for members
    await client.query(`
      DROP POLICY IF EXISTS "members_delete" ON members
    `)
    await client.query(`
      DROP POLICY IF EXISTS "Parents can delete members" ON members
    `)
    await client.query(`
      CREATE POLICY "members_delete" ON members
        FOR DELETE USING (true)
    `)
    console.log('DELETE policy for members created!')

    // Verify
    const policies = await client.query(`
      SELECT policyname, cmd FROM pg_policies WHERE tablename = 'members'
    `)
    console.log('Members policies:')
    policies.rows.forEach(p => console.log(`  ${p.cmd}: ${p.policyname}`))

  } catch (e) {
    console.error('ERROR:', e.message)
  } finally {
    await client.end()
  }
}

main()
