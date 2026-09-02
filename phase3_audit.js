const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://postgres.xcbedqffmknlzjfpuwdr:uH8%2B-88pqZeUn6n@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres'
});

async function audit() {
  await client.connect();
  
  // Check tasks with frequency
  const tasks = await client.query('SELECT frequency, COUNT(*) as count FROM tasks WHERE is_active = true GROUP BY frequency');
  console.log('=== TASK FREQUENCY DISTRIBUTION ===');
  tasks.rows.forEach(t => console.log(t.frequency + ': ' + t.count));
  
  // Check completions
  const completions = await client.query('SELECT COUNT(*) as total, COUNT(CASE WHEN approved = true THEN 1 END) as approved, COUNT(CASE WHEN approved = false THEN 1 END) as rejected, COUNT(CASE WHEN approved IS NULL THEN 1 END) as pending FROM task_completions');
  console.log('\n=== COMPLETIONS STATUS ===');
  console.log('Total: ' + completions.rows[0].total);
  console.log('Approved: ' + completions.rows[0].approved);
  console.log('Rejected: ' + completions.rows[0].rejected);
  console.log('Pending: ' + completions.rows[0].pending);
  
  // Check XP transactions
  const xp = await client.query('SELECT COUNT(*) as total, SUM(amount) as total_xp FROM xp_transactions');
  console.log('\n=== XP TRANSACTIONS ===');
  console.log('Total: ' + xp.rows[0].total);
  console.log('Total XP: ' + xp.rows[0].total_xp);
  
  // Check tables
  const tables = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name");
  console.log('\n=== TABLES ===');
  tables.rows.forEach(t => console.log(t.table_name));
  
  await client.end();
}
audit();
