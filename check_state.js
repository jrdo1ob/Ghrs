const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://postgres.xcbedqffmknlzjfpuwdr:uH8%2B-88pqZeUn6n@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres'
});

async function check() {
  await client.connect();
  
  // Check current constraint
  const c = await client.query("SELECT conname, pg_get_constraintdef(oid) as def FROM pg_constraint WHERE conrelid = 'task_approval_history'::regclass AND contype = 'c'");
  console.log('Constraints:', c.rows);
  
  // Check all distinct actions
  const a = await client.query('SELECT DISTINCT action FROM task_approval_history');
  console.log('Distinct actions:', a.rows.map(x => x.action));
  
  // Check all rows
  const r = await client.query('SELECT id, action FROM task_approval_history');
  console.log('All rows:', r.rows);
  
  await client.end();
}
check();
