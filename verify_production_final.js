const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://postgres.xcbedqffmknlzjfpuwdr:uH8%2B-88pqZeUn6n@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres'
});

async function verify() {
  await client.connect();
  
  // Check status column
  const statusCol = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='tasks' AND column_name='status'");
  console.log('=== tasks.status ===');
  console.log(statusCol.rows[0] ? '✅ EXISTS' : '❌ MISSING');
  
  // Check RPCs
  const rpcs = await client.query("SELECT proname FROM pg_proc WHERE proname IN ('complete_task_with_rewards', 'approve_task_completion', 'revoke_task_completion', 'is_task_available', 'get_available_tasks') ORDER BY proname");
  console.log('\n=== RPCs ===');
  rpcs.rows.forEach(r => console.log('✅ ' + r.proname));
  
  // Check CHECK constraint
  const constraint = await client.query("SELECT pg_get_constraintdef(oid) as def FROM pg_constraint WHERE conname = 'task_approval_history_action_check'");
  console.log('\n=== CHECK Constraint ===');
  console.log(constraint.rows[0]?.def);
  
  // Check completions
  const completions = await client.query('SELECT approved, COUNT(*) as count FROM task_completions GROUP BY approved');
  console.log('\n=== Completions ===');
  completions.rows.forEach(r => console.log('approved=' + r.approved + ': ' + r.count));
  
  // Check tasks with status
  const status = await client.query('SELECT status, COUNT(*) as count FROM tasks WHERE is_active = true GROUP BY status');
  console.log('\n=== Task Statuses ===');
  status.rows.forEach(r => console.log('status=' + r.status + ': ' + r.count));
  
  await client.end();
}
verify();
