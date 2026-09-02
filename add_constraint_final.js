const { Client } = require('pg');

async function addConstraint() {
  // Use a fresh connection
  const client = new Client({
    connectionString: 'postgresql://postgres.xcbedqffmknlzjfpuwdr:uH8%2B-88pqZeUn6n@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres'
  });
  
  await client.connect();
  
  // Check current state
  const rows = await client.query('SELECT COUNT(*) as count FROM task_approval_history');
  console.log('Rows in table:', rows.rows[0].count);
  
  // Check distinct actions
  const actions = await client.query('SELECT DISTINCT action FROM task_approval_history');
  console.log('Distinct actions:', actions.rows.map(x => x.action));
  
  // Try to add constraint
  try {
    await client.query(`
      ALTER TABLE task_approval_history ADD CONSTRAINT task_approval_history_action_check_v4
      CHECK (action IN ('approved', 'rejected', 'revoked', 'completed', 'pending'))
    `);
    console.log('Constraint added successfully');
  } catch (e) {
    console.log('Error: ' + e.message);
  }
  
  // Verify
  const c = await client.query("SELECT conname, pg_get_constraintdef(oid) as def FROM pg_constraint WHERE conrelid = 'task_approval_history'::regclass AND contype = 'c'");
  console.log('Constraints:', c.rows);
  
  await client.end();
}
addConstraint();
