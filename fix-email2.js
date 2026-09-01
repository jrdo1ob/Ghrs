const { Client } = require('pg')

async function main() {
  const client = new Client({
    connectionString: 'postgresql://postgres:uH8+-88pqZeUn6n@db.xcbedqffmknlzjfpuwdr.supabase.co:5432/postgres',
    ssl: { rejectUnauthorized: false }
  })

  try {
    await client.connect()
    console.log('Connected!')

    // Create trigger to auto-confirm new users
    await client.query(`
      CREATE OR REPLACE FUNCTION auto_confirm_email()
      RETURNS TRIGGER AS $$
      BEGIN
        IF NEW.email_confirmed_at IS NULL THEN
          NEW.email_confirmed_at := NOW();
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS auto_confirm_email_trigger ON auth.users;
      CREATE TRIGGER auto_confirm_email_trigger
        BEFORE INSERT ON auth.users
        FOR EACH ROW
        EXECUTE FUNCTION auto_confirm_email();
    `)
    console.log('Trigger created successfully!')

  } catch (e) {
    console.error('ERROR:', e.message)
  } finally {
    await client.end()
  }
}

main()
