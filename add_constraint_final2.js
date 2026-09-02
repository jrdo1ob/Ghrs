const { Client } = require('pg');

async function addConstraint() {
  const client = new Client({
    connectionString: 'postgresql://postgres.xcbedqffmknlzjfpuwdr:uH8%2B-88pqZeUn6n@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres'
  });
  
  await client.connect();
  
  // Check what's actually in the table
  const rows = await client.query('SELECT id, action, LENGTH(action) as len, octet_length(action) as bytes FROM task_approval_history');
  console.log('Rows:', rows.rows);
  
  // Check if there are any hidden characters
  for (const row of rows.rows) {
    const hex = Buffer.from(row.action, 'utf8').toString('hex');
    console.log(`Action "${row.action}": hex=${hex}, len=${row.len}, bytes=${row.bytes}`);
  }
  
  // Try to add constraint with explicit transaction
  try {
    await client.query('BEGIN');
    await client.query(`
      ALTER TABLE task_approval_history 
      ADD CONSTRAINT ah_action_final 
      CHECK (action IN ('approved', 'rejected', 'revoked', 'completed', 'pending'))
    `);
    await client.query('COMMIT');
    console.log('SUCCESS: Constraint added');
  } catch (e) {
    await client.query('ROLLBACK');
    console.log('FAILED:', e.message);
    
    // Maybe the issue is that 'revoke' is not in the list?
    // Let me check the exact values
    const testValues = ['approved', 'rejected', 'revoked', 'completed', 'pending'];
    console.log('Allowed values:', testValues);
    console.log('Contains revoke:', testValues.includes('revoke'));
  }
  
  await client.end();
}
addConstraint();
