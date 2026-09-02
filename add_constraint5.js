const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://postgres.xcbedqffmknlzjfpuwdr:uH8%2B-88pqZeUn6n@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres'
});

async function addConstraint() {
  await client.connect();
  
  // Try with a completely new constraint name
  try {
    await client.query(`
      ALTER TABLE task_approval_history ADD CONSTRAINT ah_action_check_v3
      CHECK (action IN ('approved', 'rejected', 'revoked', 'completed', 'pending'))
    `);
    console.log('Constraint added successfully');
  } catch (e) {
    console.log('Error: ' + e.message);
    console.log('Error code: ' + e.code);
    console.log('Detail: ' + e.detail);
  }
  
  // Verify
  const c = await client.query("SELECT conname, pg_get_constraintdef(oid) as def FROM pg_constraint WHERE conrelid = 'task_approval_history'::regclass AND contype = 'c'");
  console.log('Constraints:', c.rows);
  
  await client.end();
}
addConstraint();
