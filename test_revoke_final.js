const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://postgres.xcbedqffmknlzjfpuwdr:uH8%2B-88pqZeUn6n@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres'
});

async function testRevoke() {
  await client.connect();
  
  // Get a task with approval
  const task = await client.query(`
    SELECT t.id, t.title, t.xp_reward, m.id as child_id, m.name as child_name
    FROM tasks t
    JOIN members m ON m.family_id = t.family_id AND m.role = 'child'
    WHERE t.is_active = true AND t.requires_approval = true
    LIMIT 1
  `);
  
  const { id, title, xp_reward, child_id, child_name } = task.rows[0];
  console.log('=== REVOKE TEST: ' + title + ' for ' + child_name + ' ===');
  console.log('xp_reward: ' + xp_reward);
  
  // Step 1: Child completes
  console.log('\n--- Step 1: Child Complete ---');
  await client.query('SELECT complete_task_with_rewards($1, $2)', [id, child_id]);
  
  const completion = await client.query(`
    SELECT id, approved FROM task_completions
    WHERE task_id = $1 AND member_id = $2 AND completed_at::date = CURRENT_DATE
    ORDER BY completed_at DESC LIMIT 1
  `, [id, child_id]);
  const completionId = completion.rows[0].id;
  console.log('Completion ID: ' + completionId);
  console.log('Approved: ' + completion.rows[0].approved + ' (should be NULL)');
  
  // Step 2: Parent approves
  console.log('\n--- Step 2: Parent Approve ---');
  await client.query('SELECT approve_task_completion($1, true, $2)', [completionId, 'Test approve']);
  
  const afterApprove = await client.query(`SELECT approved FROM task_completions WHERE id = $1`, [completionId]);
  console.log('Approved: ' + afterApprove.rows[0].approved + ' (should be TRUE)');
  
  const xpAfterApprove = await client.query(`SELECT SUM(amount) as total FROM xp_transactions WHERE source_id = $1`, [completionId]);
  console.log('XP after approve: ' + xpAfterApprove.rows[0].total + ' (should be ' + xp_reward + ')');
  
  // Step 3: Parent revokes
  console.log('\n--- Step 3: Parent Revoke ---');
  await client.query('SELECT revoke_task_approval($1, $2)', [completionId, 'Test revoke']);
  
  const afterRevoke = await client.query(`SELECT approved FROM task_completions WHERE id = $1`, [completionId]);
  console.log('Approved: ' + afterRevoke.rows[0].approved + ' (should be FALSE)');
  
  const xpAfterRevoke = await client.query(`SELECT SUM(amount) as total FROM xp_transactions WHERE source_id = $1`, [completionId]);
  console.log('XP after revoke: ' + xpAfterRevoke.rows[0].total + ' (should be 0)');
  
  // Check History
  const history = await client.query(`SELECT action, new_status FROM task_approval_history WHERE completion_id = $1 ORDER BY created_at`, [completionId]);
  console.log('\nHistory:');
  history.rows.forEach(h => console.log('  ' + h.action + ' → ' + h.new_status));
  
  // Step 4: Cleanup
  console.log('\n--- Cleanup ---');
  await client.query('DELETE FROM task_completions WHERE id = $1', [completionId]);
  await client.query('DELETE FROM task_approval_history WHERE completion_id = $1', [completionId]);
  await client.query('DELETE FROM xp_transactions WHERE source_id = $1', [completionId]);
  
  console.log('\n✅ Revoke Test Complete');
  await client.end();
}
testRevoke();
