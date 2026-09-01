const { Client } = require('pg')

async function main() {
  const client = new Client({
    connectionString: 'postgresql://postgres:uH8+-88pqZeUn6n@db.xcbedqffmknlzjfpuwdr.supabase.co:5432/postgres',
    ssl: { rejectUnauthorized: false }
  })

  try {
    await client.connect()
    console.log('Connected!')

    // Add INSERT policy for families
    await client.query(`
      CREATE POLICY "Authenticated users can create families"
        ON families FOR INSERT
        WITH CHECK (auth.uid() IS NOT NULL);
    `)
    console.log('Families INSERT policy created!')

    // Add INSERT policy for auth_identities
    await client.query(`
      CREATE POLICY "Authenticated users can link their identity"
        ON auth_identities FOR INSERT
        WITH CHECK (auth.uid() = auth_user_id);
    `)
    console.log('Auth identities INSERT policy created!')

    // Add SELECT policy for members (own profile)
    await client.query(`
      CREATE POLICY "Members can view their own profile"
        ON members FOR SELECT
        USING (id = (SELECT member_id FROM get_current_member()));
    `)
    console.log('Members own profile SELECT policy created!')

    console.log('All policies fixed!')

  } catch (e) {
    console.error('ERROR:', e.message)
  } finally {
    await client.end()
  }
}

main()
