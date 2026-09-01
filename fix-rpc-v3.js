const { Client } = require('pg')

async function main() {
  const client = new Client({
    connectionString: 'postgresql://postgres:uH8+-88pqZeUn6n@db.xcbedqffmknlzjfpuwdr.supabase.co:5432/postgres',
    ssl: { rejectUnauthorized: false }
  })

  try {
    await client.connect()

    await client.query(`DROP FUNCTION IF EXISTS verify_member_pin(TEXT, TEXT)`)
    
    await client.query(`
      CREATE OR REPLACE FUNCTION verify_member_pin(
        p_login_code TEXT,
        p_pin TEXT
      )
      RETURNS TABLE(member_id UUID, member_name TEXT, member_role TEXT, family_id UUID) AS $$
      DECLARE
        v_id UUID;
        v_name TEXT;
        v_role TEXT;
        v_family_id UUID;
        v_pin_hash TEXT;
      BEGIN
        SELECT m.id, m.name, m.role, m.family_id, m.pin_hash 
        INTO v_id, v_name, v_role, v_family_id, v_pin_hash
        FROM members m
        WHERE m.login_code = UPPER(p_login_code);

        IF v_id IS NULL THEN
          RAISE EXCEPTION 'Member not found with code: %', p_login_code;
        END IF;

        IF v_pin_hash IS NULL THEN
          RAISE EXCEPTION 'No PIN set for this member';
        END IF;

        IF (v_pin_hash = crypt(p_pin, v_pin_hash)) THEN
          RETURN QUERY
          SELECT v_id, v_name, v_role, v_family_id;
        ELSE
          RAISE EXCEPTION 'Invalid PIN';
        END IF;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `)
    console.log('Function recreated!')

    // Test with correct PIN
    try {
      const result = await client.query(`SELECT * FROM verify_member_pin('KXNZX2-101', '1234')`)
      console.log('Test 1234:', result.rows)
    } catch (e) {
      console.log('Error 1234:', e.message)
    }

    // Test with wrong PIN
    try {
      const result2 = await client.query(`SELECT * FROM verify_member_pin('KXNZX2-101', '0000')`)
      console.log('Test 0000:', result2.rows)
    } catch (e) {
      console.log('Error 0000:', e.message)
    }

    // Test with wrong code
    try {
      const result3 = await client.query(`SELECT * FROM verify_member_pin('KXNZX2-999', '1234')`)
      console.log('Test wrong code:', result3.rows)
    } catch (e) {
      console.log('Error wrong code:', e.message)
    }

  } catch (e) {
    console.error('ERROR:', e.message)
  } finally {
    await client.end()
  }
}

main()
