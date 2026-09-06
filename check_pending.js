const { Client } = require('pg');
const client = new Client({
  connectionString: process.env.SUPABASE_DB_URL
});

async function check() {
  await client.connect();
  
  // Simulate what the frontend queries
  const tasks = await client.query('SELECT id, title FROM tasks WHERE is_active = true AND is_deleted = false LIMIT 5');
  
  for (const task of tasks.rows) {
    const pending = await client.query('SELECT COUNT(*) as count FROM task_completions WHERE task_id = $1 AND approved IS NULL', [task.id]);
    const rejected = await client.query('SELECT COUNT(*) as count FROM task_completions WHERE task_id = $1 AND approved = false', [task.id]);
    console.log(task.title + ': pending=' + pending.rows[0].count + ', rejected=' + rejected.rows[0].count);
  }
  
  await client.end();
}
check();
