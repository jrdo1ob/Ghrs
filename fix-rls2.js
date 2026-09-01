const { Client } = require('pg')

async function main() {
  const client = new Client({
    connectionString: 'postgresql://postgres:uH8+-88pqZeUn6n@db.xcbedqffmknlzjfpuwdr.supabase.co:5432/postgres',
    ssl: { rejectUnauthorized: false }
  })

  try {
    await client.connect()
    console.log('Connected!')

    // List all policies on families table
    const policies = await client.query(`
      SELECT policyname, cmd, qual, with_check 
      FROM pg_policies 
      WHERE tablename = 'families'
    `)
    console.log('Current policies on families:')
    policies.rows.forEach(p => console.log(`  - ${p.cmd}: ${p.policyname}`))

    // Drop all existing policies and recreate
    await client.query(`
      DROP POLICY IF EXISTS "Family members can view their family" ON families;
      DROP POLICY IF EXISTS "Only owner can update family" ON families;
      DROP POLICY IF EXISTS "Authenticated users can create families" ON families;
      DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON families;
    `)
    console.log('Dropped old policies')

    // Create simple policies
    await client.query(`
      CREATE POLICY "families_select" ON families
        FOR SELECT USING (
          is_family_member(id) OR auth.uid() = created_by
        );
    `)
    console.log('SELECT policy created')

    await client.query(`
      CREATE POLICY "families_insert" ON families
        FOR INSERT WITH CHECK (
          auth.uid() IS NOT NULL
        );
    `)
    console.log('INSERT policy created')

    await client.query(`
      CREATE POLICY "families_update" ON families
        FOR UPDATE USING (
          is_family_owner() AND is_family_member(id)
        );
    `)
    console.log('UPDATE policy created')

    // Verify
    const newPolicies = await client.query(`
      SELECT policyname, cmd FROM pg_policies WHERE tablename = 'families'
    `)
    console.log('\nFinal policies:')
    newPolicies.rows.forEach(p => console.log(`  - ${p.cmd}: ${p.policyname}`))

  } catch (e) {
    console.error('ERROR:', e.message)
  } finally {
    await client.end()
  }
}

main()
