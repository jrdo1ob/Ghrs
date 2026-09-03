const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://postgres.xcbedqffmknlzjfpuwdr:uH8%2B-88pqZeUn6n@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres'
});

async function audit() {
  await client.connect();
  
  // 1. Get all completions
  console.log('=== 1. All task_completions ===');
  const completions = await client.query(`
    SELECT id, task_id, member_id, approved, completed_at 
    FROM task_completions 
    ORDER BY completed_at DESC
  `);
  completions.rows.forEach(r => {
    console.log(`  ${r.id} | task: ${r.task_id} | member: ${r.member_id} | approved: ${r.approved} | ${r.completed_at}`);
  });
  
  // 2. Check if each completion has a history event
  console.log('\n=== 2. History events for each completion ===');
  for (const c of completions.rows) {
    const history = await client.query(
      'SELECT action FROM task_approval_history WHERE completion_id = $1',
      [c.id]
    );
    const actions = history.rows.map(r => r.action);
    console.log(`  ${c.id.substring(0, 8)}... | approved=${c.approved} | history: ${actions.length > 0 ? actions.join(', ') : 'NONE'}`);
  }
  
  // 3. Check complete_task_with_rewards RPC
  console.log('\n=== 3. complete_task_with_rewards RPC ===');
  const rpc = await client.query("SELECT pg_get_functiondef(oid) as def FROM pg_proc WHERE proname = 'complete_task_with_rewards'");
  const hasHistory = rpc.rows[0]?.def.includes('task_approval_history');
  console.log('Records history:', hasHistory);
  
  // 4. Check if old completions were created before history tracking
  console.log('\n=== 4. Completion timestamps vs History creation ===');
  const oldCompletions = await client.query(`
    SELECT tc.id, tc.completed_at, 
           (SELECT created_at FROM task_approval_history tah WHERE tah.completion_id = tc.id) as history_created
    FROM task_completions tc
    ORDER BY tc.completed_at ASC
  `);
  oldCompletions.rows.forEach(r => {
    console.log(`  ${r.id.substring(0, 8)}... | completed: ${r.completed_at} | history: ${r.history_created || 'NO HISTORY'}`);
  });
  
  // 5. Check the 3 revoke events
  console.log('\n=== 5. Revoke events ===');
  const revokes = await client.query('SELECT * FROM task_approval_history WHERE action = \'revoke\'');
  revokes.rows.forEach(r => {
    console.log(`  completion_id: ${r.completion_id} | member: ${r.member_id} | task: ${r.task_id} | ${r.created_at}`);
  });
  
  await client.end();
}
audit();
