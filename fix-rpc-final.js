const { Client } = require('pg')

async function main() {
  const client = new Client({
    connectionString: 'postgresql://postgres:uH8+-88pqZeUn6n@db.xcbedqffmknlzjfpuwdr.supabase.co:5432/postgres',
    ssl: { rejectUnauthorized: false }
  })

  try {
    await client.connect()

    // Drop old function
    await client.query(`DROP FUNCTION IF EXISTS verify_member_pin(TEXT, TEXT)`)

    // Create fixed verify_member_pin
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
          RAISE EXCEPTION 'Member not found';
        END IF;

        SELECT (fp.stored_hash = crypt(p_pin, fp.stored_hash)) INTO v_pin_valid
        FROM family_pins fp
        WHERE fp.member_id = v_member.id;

        IF v_pin_valid IS NULL OR NOT v_pin_valid THEN
          RAISE EXCEPTION 'Invalid PIN';
        END IF;

        RETURN QUERY
        SELECT v_member.id, v_member.name, v_member.role, v_member.family_id;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `)
    console.log('Function fixed!')

    // Test it
    console.log('\nTesting with KXNZX2-101...')
    try {
      const result = await client.query(`SELECT * FROM verify_member_pin('KXNZX2-101', '1234')`)
      console.log('Result:', result.rows)
    } catch (e) {
      console.log('Error:', e.message)
    }

    // Check what PIN hash exists for علي
    const ali = await client.query(`
      SELECT m.id, m.name, fp.pin_hash 
      FROM members m 
      LEFT JOIN family_pins fp ON fp.member_id = m.id 
      WHERE m.login_code = 'KXNZX2-101'
    `)
    console.log('\nعلي data:', ali.rows)

    // Also check if shme exists
    const shme = await client.query(`SELECT name, login_code FROM members WHERE name = 'شمه'`)
    console.log('شمه:', shme.rows)

  } catch (e) {
    console.error('ERROR:', e.message)
  } finally {
    await client.end()
  }
}

main()
