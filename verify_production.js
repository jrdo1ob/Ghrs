const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://postgres.xcbedqffmknlzjfpuwdr:uH8%2B-88pqZeUn6n@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres'
});

async function check() {
  await client.connect();
  
  // Check RPCs
  const rpcs = await client.query("SELECT proname FROM pg_proc WHERE proname IN ('complete_task_with_rewards', 'approve_task_completion', 'revoke_task_completion', 'is_task_available') ORDER BY proname");
  console.log('RPCs:', rpcs.rows.map(r => r.proname));
  
  // Check CHECK constraint
  const constraint = await client.query("SELECT pg_get_constraintdef(oid) as def FROM pg_constraint WHERE conname = 'task_approval_history_action_check'");
  console.log('CHECK constraint:', constraint.rows[0]?.def);
  
  // Check tasks with status
  const status = await client.query('SELECT status, COUNT(*) as count FROM tasks WHERE is_active = true GROUP BY status');
  console.log('Task statuses:', status.rows);
  
  // Check completions
  const completions = await client.query('SELECT approved, COUNT(*) as count FROM task_completions GROUP BY approved');
  console.log('Completions:', completions.rows);
  
  await client.end();
}
check();
