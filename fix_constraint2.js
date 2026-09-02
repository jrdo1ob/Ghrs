const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://postgres.xcbedqffmknlzjfpuwdr:uH8%2B-88pqZeUn6n@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres'
});

async function fix() {
  await client.connect();
  
  // Get all constraints
  const constraints = await client.query(`
    SELECT conname, pg_get_constraintdef(oid) as def
    FROM pg_constraint
    WHERE conrelid = 'task_approval_history'::regclass
    AND contype = 'c'
  `);
  console.log('Constraints:', constraints.rows);
  
  // Try to drop all CHECK constraints
  for (const c of constraints.rows) {
    try {
      await client.query(`ALTER TABLE task_approval_history DROP CONSTRAINT IF EXISTS ${c.conname}`);
      console.log('Dropped: ' + c.conname);
    } catch (e) {
      console.log('Failed to drop ' + c.conname + ': ' + e.message);
    }
  }
  
  // Add new constraint
  try {
    await client.query(`
      ALTER TABLE task_approval_history ADD CONSTRAINT task_approval_history_action_check
      CHECK (action IN ('approved', 'rejected', 'revoked', 'completed', 'pending'))
    `);
    console.log('Added new constraint');
  } catch (e) {
    console.log('Failed to add constraint: ' + e.message);
  }
  
  await client.end();
}
fix();
