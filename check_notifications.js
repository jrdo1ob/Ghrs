const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://postgres.xcbedqffmknlzjfpuwdr:uH8%2B-88pqZeUn6n@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres'
});

async function check() {
  await client.connect();
  
  // Check if notifications table exists
  const tables = await client.query("SELECT table_name FROM information_schema.tables WHERE table_name LIKE '%notification%'");
  console.log('Notification tables:', tables.rows.map(t => t.table_name));
  
  // Check pending completions
  const pending = await client.query('SELECT COUNT(*) as count FROM task_completions WHERE approved IS NULL');
  console.log('Pending completions:', pending.rows[0].count);
  
  // Check realtime in frontend
  console.log('\nRealtime: Supabase Realtime used in Dashboard');
  console.log('Channel: dashboard-completions');
  console.log('Table: task_completions');
  console.log('Event: * (all changes)');
  
  await client.end();
}
check();
