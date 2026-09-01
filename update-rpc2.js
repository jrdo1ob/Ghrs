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
    await client.query(`DROP FUNCTION IF EXISTS verify_member_pin(UUID, TEXT)`)

    // Create new verify_member_pin that accepts combined login code
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
        SELECT id, name, role, family_id INTO v_member
        FROM members
        WHERE login_code = UPPER(p_login_code);

        IF v_member IS NULL THEN
          RAISE EXCEPTION 'Member not found';
        END IF;

        SELECT stored_hash = crypt(p_pin, stored_hash) INTO v_pin_valid
        FROM family_pins
        WHERE member_id = v_member.id;

        IF v_pin_valid IS NULL OR NOT v_pin_valid THEN
          RAISE EXCEPTION 'Invalid PIN';
        END IF;

        RETURN QUERY
        SELECT v_member.id, v_member.name, v_member.role, v_member.family_id;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `)
    console.log('verify_member_pin updated!')

  } catch (e) {
    console.error('ERROR:', e.message)
  } finally {
    await client.end()
  }
}

main()
