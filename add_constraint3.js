const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://postgres.xcbedqffmknlzjfpuwdr:uH8%2B-88pqZeUn6n@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres'
});

async function addConstraint() {
  await client.connect();
  
  // First, check if constraint exists
  const existing = await client.query("SELECT conname FROM pg_constraint WHERE conrelid = 'task_approval_history'::regclass AND contype = 'c'");
  console.log('Existing constraints:', existing.rows);
  
  // Drop ALL CHECK constraints
  for (const c of existing.rows) {
    try {
      await client.query(`ALTER TABLE task_approval_history DROP CONSTRAINT ${c.conname}`);
      console.log('Dropped: ' + c.conname);
    } catch (e) {
      console.log('Failed to drop ' + c.conname + ': ' + e.message);
    }
  }
  
  // Verify no constraints
  const after = await client.query("SELECT conname FROM pg_constraint WHERE conrelid = 'task_approval_history'::regclass AND contype = 'c'");
  console.log('After drop:', after.rows);
  
  // Add new constraint
  try {
    await client.query(`
      ALTER TABLE task_approval_history ADD CONSTRAINT task_approval_history_action_check
      CHECK (action IN ('approved', 'rejected', 'revoked', 'completed', 'pending'))
    `);
    console.log('Constraint added successfully');
  } catch (e) {
    console.log('Error: ' + e.message);
  }
  
  await client.end();
}
addConstraint();
