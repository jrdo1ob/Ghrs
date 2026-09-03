const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://postgres.xcbedqffmknlzjfpuwdr:uH8%2B-88pqZeUn6n@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres'
});

async function check() {
  await client.connect();
  
  // Check if status column exists
  const statusCol = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name='tasks' AND column_name='status'");
  console.log('Status column exists:', statusCol.rows.length > 0);
  
  // Check all task columns
  const taskCols = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name='tasks' ORDER BY ordinal_position");
  console.log('Task columns:', taskCols.rows.map(r => r.column_name));
  
  // Check completions
  const completions = await client.query('SELECT approved, COUNT(*) as count FROM task_completions GROUP BY approved');
  console.log('Completions:', completions.rows);
  
  await client.end();
}
check();
