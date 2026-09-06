const { Client } = require('pg');
const client = new Client({
  connectionString: process.env.SUPABASE_DB_URL
});

async function addConstraint() {
  await client.connect();
  
  try {
    await client.query(`
      ALTER TABLE task_approval_history ADD CONSTRAINT task_approval_history_action_check
      CHECK (action IN ('approved', 'rejected', 'revoked', 'completed', 'pending'))
    `);
    console.log('Constraint added successfully');
  } catch (e) {
    console.log('Error: ' + e.message);
  }
  
  // Verify
  const c = await client.query("SELECT conname, pg_get_constraintdef(oid) as def FROM pg_constraint WHERE conrelid = 'task_approval_history'::regclass AND contype = 'c'");
  console.log('Current constraint:', c.rows);
  
  await client.end();
}
addConstraint();
