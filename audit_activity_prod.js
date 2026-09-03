const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://postgres.xcbedqffmknlzjfpuwdr:uH8%2B-88pqZeUn6n@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres'
});

async function audit() {
  await client.connect();
  
  console.log('=== Production Data Audit ===\n');
  
  // 1. Check task_approval_history
  console.log('--- task_approval_history ---');
  const history = await client.query('SELECT id, action, member_id, performed_by, task_id, created_at FROM task_approval_history ORDER BY created_at DESC');
  console.log('Total records:', history.rows.length);
  history.rows.forEach(r => console.log(`  ${r.action} | member: ${r.member_id} | performer: ${r.performed_by} | task: ${r.task_id} | ${r.created_at}`));
  
  // 2. Check completions
  console.log('\n--- task_completions ---');
  const completions = await client.query('SELECT id, approved, member_id, task_id, completed_at FROM task_completions ORDER BY completed_at DESC');
  console.log('Total completions:', completions.rows.length);
  completions.rows.forEach(r => {
    console.log(`  approved=${r.approved} | member: ${r.member_id} | task: ${r.task_id} | ${r.completed_at}`);
  });
  
  // 3. Check distinct actions
  console.log('\n--- Distinct Actions in History ---');
  const actions = await client.query('SELECT DISTINCT action FROM task_approval_history');
  actions.rows.forEach(r => console.log(`  ${r.action}`));
  
  // 4. Check if approve/reject RPCs record history
  console.log('\n--- RPC History Check ---');
  const rpc = await client.query("SELECT pg_get_functiondef(oid) as def FROM pg_proc WHERE proname = 'approve_task_completion'");
  const hasHistory = rpc.rows[0]?.def.includes('task_approval_history');
  console.log('approve_task_completion records history:', hasHistory);
  
  await client.end();
}
audit();
