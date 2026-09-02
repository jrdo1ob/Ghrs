const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://postgres.xcbedqffmknlzjfpuwdr:uH8%2B-88pqZeUn6n@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres'
});

async function addConstraint() {
  await client.connect();
  
  // Use a transaction to ensure atomicity
  await client.query('BEGIN');
  
  try {
    // Drop any existing CHECK constraints
    const existing = await client.query(`
      SELECT conname FROM pg_constraint 
      WHERE conrelid = 'task_approval_history'::regclass 
      AND contype = 'c'
    `);
    
    for (const c of existing.rows) {
      await client.query(`ALTER TABLE task_approval_history DROP CONSTRAINT ${c.conname}`);
      console.log('Dropped: ' + c.conname);
    }
    
    // Add new constraint
    await client.query(`
      ALTER TABLE task_approval_history ADD CONSTRAINT task_approval_history_action_check
      CHECK (action IN ('approved', 'rejected', 'revoked', 'completed', 'pending'))
    `);
    
    await client.query('COMMIT');
    console.log('Constraint added successfully');
  } catch (e) {
    await client.query('ROLLBACK');
    console.log('Error: ' + e.message);
  }
  
  // Verify
  const c = await client.query("SELECT conname, pg_get_constraintdef(oid) as def FROM pg_constraint WHERE conrelid = 'task_approval_history'::regclass AND contype = 'c'");
  console.log('Current constraint:', c.rows);
  
  await client.end();
}
addConstraint();
