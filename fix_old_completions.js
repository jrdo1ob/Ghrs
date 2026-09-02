const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://postgres.xcbedqffmknlzjfpuwdr:uH8%2B-88pqZeUn6n@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres'
});

async function fix() {
  await client.connect();
  
  // Update old completions that have approved=false and require approval
  const result = await client.query(`
    UPDATE task_completions 
    SET approved = NULL 
    WHERE approved = false 
    AND task_id IN (SELECT id FROM tasks WHERE requires_approval = true)
  `);
  console.log('Updated ' + result.rowCount + ' completions to NULL');
  
  // Verify
  const check = await client.query('SELECT approved, COUNT(*) as count FROM task_completions GROUP BY approved');
  check.rows.forEach(r => console.log('approved=' + r.approved + ': ' + r.count));
  
  await client.end();
}
fix();
