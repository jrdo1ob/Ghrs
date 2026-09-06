const { Client } = require('pg');
const client = new Client({
  connectionString: process.env.SUPABASE_DB_URL
});

async function check() {
  await client.connect();
  const r = await client.query('SELECT DISTINCT action FROM task_approval_history');
  console.log('Current actions:', r.rows.map(x => x.action));
  
  const c = await client.query("SELECT pg_get_constraintdef(oid) as def FROM pg_constraint WHERE conname = 'task_approval_history_action_check'");
  console.log('Current constraint:', c.rows[0]?.def);
  
  await client.end();
}
check();
