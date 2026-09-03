const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://postgres.xcbedqffmknlzjfpuwdr:uH8%2B-88pqZeUn6n@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres'
});

async function audit() {
  await client.connect();
  
  // 1. Check task_approval_history
  console.log('=== task_approval_history ===');
  const history = await client.query('SELECT id, action, member_id, performed_by, task_id, created_at FROM task_approval_history ORDER BY created_at DESC');
  console.log('Total records:', history.rows.length);
  history.rows.forEach(r => {
    console.log(`  ${r.action} | member: ${r.member_id} | performer: ${r.performed_by} | task: ${r.task_id} | ${r.created_at}`);
  });
  
  // 2. Check completions
  console.log('\n=== task_completions ===');
  const completions = await client.query('SELECT id, approved, member_id, task_id, completed_at FROM task_completions ORDER BY completed_at DESC LIMIT 10');
  console.log('Total completions:', completions.rows.length);
  completions.rows.forEach(r => {
    console.log(`  approved=${r.approved} | member: ${r.member_id} | task: ${r.task_id} | ${r.completed_at}`);
  });
  
  // 3. Check what the activity page queries
  console.log('\n=== Activity Page Query Analysis ===');
  console.log('Page queries task_approval_history with *');
  console.log('Page filters by family_id and typeFilter');
  console.log('Page maps action values to display');
  
  // 4. Check distinct action values
  console.log('\n=== Distinct Actions ===');
  const actions = await client.query('SELECT DISTINCT action FROM task_approval_history');
  actions.rows.forEach(r => console.log(`  ${r.action}`));
  
  await client.end();
}
audit();
