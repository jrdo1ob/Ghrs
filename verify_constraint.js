const { Client } = require('pg');

const connectionString = 'postgresql://postgres.xcbedqffmknlzjfpuwdr:uH8%2B-88pqZeUn6n@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres';

async function verify() {
  const client = new Client({ connectionString });
  try {
    await client.connect();

    // Check constraint
    const constraint = await client.query(`
      SELECT pg_get_constraintdef(oid) as def
      FROM pg_constraint
      WHERE conname = 'tasks_frequency_check'
    `);
    console.log('Constraint:', constraint.rows[0]?.def);

    // Check for any invalid frequency values
    const invalid = await client.query(`
      SELECT id, title, frequency FROM tasks
      WHERE frequency NOT IN ('daily', 'weekly', 'monthly', 'custom', 'once', 'as_needed')
    `);
    console.log('Invalid frequency rows:', invalid.rows.length);
    if (invalid.rows.length > 0) {
      console.log('Invalid rows:', invalid.rows);
    }

    // Check current frequency distribution
    const dist = await client.query(`SELECT frequency, COUNT(*) as cnt FROM tasks GROUP BY frequency`);
    console.log('Frequency distribution:', dist.rows);

    console.log('Done!');
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await client.end();
  }
}
verify();
