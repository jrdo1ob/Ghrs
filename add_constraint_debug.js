const { Client } = require('pg');

async function addConstraint() {
  const client = new Client({
    connectionString: 'postgresql://postgres.xcbedqffmknlzjfpuwdr:uH8%2B-88pqZeUn6n@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres'
  });
  
  await client.connect();
  
  // First, let's see what's actually in the table
  const rows = await client.query('SELECT id, action FROM task_approval_history');
  console.log('Current rows:', rows.rows);
  
  // Try to add constraint with a very specific name
  try {
    await client.query(`
      ALTER TABLE task_approval_history 
      ADD CONSTRAINT ah_action_v5 
      CHECK (action IN ('approved', 'rejected', 'revoked', 'completed', 'pending'))
    `);
    console.log('SUCCESS: Constraint added');
  } catch (e) {
    console.log('FAILED:', e.message);
    console.log('Error code:', e.code);
    
    // Let's try to understand what's happening
    // Maybe the issue is that we need to check the actual constraint definition
    const test = await client.query(`
      SELECT CHECK (action IN ('approved', 'rejected', 'revoked', 'completed', 'pending')) as test_value
    `);
    console.log('Test:', test.rows);
  }
  
  await client.end();
}
addConstraint();
