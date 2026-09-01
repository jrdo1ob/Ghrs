const { Client } = require('pg')

async function main() {
  const client = new Client({
    connectionString: 'postgresql://postgres:uH8+-88pqZeUn6n@db.xcbedqffmknlzjfpuwdr.supabase.co:5432/postgres',
    ssl: { rejectUnauthorized: false }
  })

  try {
    await client.connect()

    // Check family_pins columns
    const cols = await client.query(`
      SELECT column_name FROM information_schema.columns WHERE table_name = 'family_pins'
    `)
    console.log('family_pins columns:', cols.rows.map(r => r.column_name))

    // Check members columns
    const memberCols = await client.query(`
      SELECT column_name FROM information_schema.columns WHERE table_name = 'members'
    `)
    console.log('members columns:', memberCols.rows.map(r => r.column_name))

    // Get ali's pin hash directly from members table
    const ali = await client.query(`
      SELECT id, name, pin_hash FROM members WHERE login_code = 'KXNZX2-101'
    `)
    console.log('\nعلي pin_hash:', ali.rows[0]?.pin_hash)

    // Drop and recreate the function using pin_hash from members table
    await client.query(`DROP FUNCTION IF EXISTS verify_member_pin(TEXT, TEXT)`)
    
    await client.query(`
      CREATE OR REPLACE FUNCTION verify_member_pin(
        p_login_code TEXT,
        p_pin TEXT
      )
      RETURNS TABLE(member_id UUID, member_name TEXT, member_role TEXT, family_id UUID) AS $$
      DECLARE
        v_member RECORD;
        v_pin_valid BOOLEAN;
      BEGIN
        SELECT m.id, m.name, m.role, m.family_id INTO v_member
        FROM members m
        WHERE m.login_code = UPPER(p_login_code);

        IF v_member IS NULL THEN
          RAISE EXCEPTION 'Member not found with code: %', p_login_code;
        END IF;

        IF v_member.pin_hash IS NULL THEN
          RAISE EXCEPTION 'No PIN set for this member';
        END IF;

        v_pin_valid := (v_member.pin_hash = crypt(p_pin, v_member.pin_hash));

        IF NOT v_pin_valid THEN
          RAISE EXCEPTION 'Invalid PIN';
        END IF;

        RETURN QUERY
        SELECT v_member.id, v_member.name, v_member.role, v_member.family_id;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `)
    console.log('\nFunction recreated!')

    // Test it
    console.log('\nTesting...')
    try {
      const result = await client.query(`SELECT * FROM verify_member_pin('KXNZX2-101', '1234')`)
      console.log('SUCCESS:', result.rows)
    } catch (e) {
      console.log('Error:', e.message)
    }

    // Try with wrong PIN
    try {
      const result2 = await client.query(`SELECT * FROM verify_member_pin('KXNZX2-101', '0000')`)
      console.log('Wrong PIN result:', result2.rows)
    } catch (e) {
      console.log('Wrong PIN error (expected):', e.message)
    }

  } catch (e) {
    console.error('ERROR:', e.message)
  } finally {
    await client.end()
  }
}

main()
