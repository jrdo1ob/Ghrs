const { Client } = require('pg');

const connectionString = 'postgresql://postgres.xcbedqffmknlzjfpuwdr:uH8%2B-88pqZeUn6n@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres';

async function fixConstraint() {
  const client = new Client({ connectionString });
  try {
    await client.connect();
    console.log('Connected');

    // Drop old constraint
    await client.query(`ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_frequency_check`);
    console.log('Dropped old constraint');

    // Add new constraint with all valid values
    await client.query(`ALTER TABLE tasks ADD CONSTRAINT tasks_frequency_check CHECK (frequency IN ('daily', 'weekly', 'monthly', 'custom', 'once', 'as_needed'))`);
    console.log('Added new constraint');

    // Verify
    const result = await client.query(`
      SELECT conname, pg_get_constraintdef(oid) as def
      FROM pg_constraint
      WHERE conname = 'tasks_frequency_check'
    `);
    console.log('Constraint:', result.rows[0]?.def);

    // Test insert
    await client.query(`INSERT INTO tasks (family_id, title, frequency, xp_reward, created_by, is_active)
      SELECT id, 'test', 'once', 1, id, false FROM members WHERE role = 'owner' LIMIT 1`);
    console.log('Test insert with frequency=once: OK');

    // Clean up test
    await client.query(`DELETE FROM tasks WHERE title = 'test' AND is_active = false`);
    console.log('Cleaned up test');

    console.log('Done!');
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await client.end();
  }
}
fixConstraint();
