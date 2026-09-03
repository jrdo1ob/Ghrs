const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://postgres.xcbedqffmknlzjfpuwdr:uH8%2B-88pqZeUn6n@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres'
});

async function check() {
  await client.connect();
  
  console.log('=== Testing complete_task_with_rewards ===');
  
  // Get a test task
  const task = await client.query(`
    SELECT t.id, t.title, t.xp_reward, m.id as child_id, m.name as child_name, t.status
    FROM tasks t
    JOIN members m ON m.family_id = t.family_id AND m.role = 'child'
    WHERE t.is_active = true AND t.status = 'pending'
    LIMIT 1
  `);
  
  if (task.rows.length === 0) {
    console.log('No pending task found for testing');
    await client.end();
    return;
  }
  
  const { id, title, xp_reward, child_id, child_name, status } = task.rows[0];
  console.log('Test task:', title, '| child:', child_name, '| xp:', xp_reward, '| status:', status);
  
  // TEST A: Complete
  console.log('\n--- TEST A: Complete ---');
  try {
    await client.query('SELECT complete_task_with_rewards($1, $2)', [id, child_id]);
    const afterComplete = await client.query('SELECT status FROM tasks WHERE id = $1', [id]);
    console.log('After complete - status:', afterComplete.rows[0].status);
  } catch (e) {
    console.log('Error:', e.message);
  }
  
  // Get completion
  const completion = await client.query(`
    SELECT id, approved FROM task_completions
    WHERE task_id = $1 AND member_id = $2 AND completed_at::date = CURRENT_DATE
    ORDER BY completed_at DESC LIMIT 1
  `, [id, child_id]);
  
  if (completion.rows.length === 0) {
    console.log('No completion found');
    await client.end();
    return;
  }
  
  const completionId = completion.rows[0].id;
  console.log('Completion ID:', completionId, '| approved:', completion.rows[0].approved);
  
  // Get XP before
  const xpBefore = await client.query(`SELECT SUM(amount) as total FROM xp_transactions WHERE member_id = $1`, [child_id]);
  console.log('XP before approve:', xpBefore.rows[0].total);
  
  // TEST B: Approve
  console.log('\n--- TEST B: Approve ---');
  try {
    await client.query('SELECT approve_task_completion($1, true, $2)', [completionId, 'Test approve']);
    const afterApprove = await client.query('SELECT status FROM tasks WHERE id = $1', [id]);
    console.log('After approve - status:', afterApprove.rows[0].status);
  } catch (e) {
    console.log('Error:', e.message);
  }
  
  // Get XP after approve
  const xpAfterApprove = await client.query(`SELECT SUM(amount) as total FROM xp_transactions WHERE member_id = $1`, [child_id]);
  console.log('XP after approve:', xpAfterApprove.rows[0].total);
  
  // TEST C: Duplicate Approve (idempotent check)
  console.log('\n--- TEST C: Duplicate Approve ---');
  try {
    await client.query('SELECT approve_task_completion($1, true, $2)', [completionId, 'Test duplicate']);
    const afterDuplicate = await client.query('SELECT status FROM tasks WHERE id = $1', [id]);
    console.log('After duplicate approve - status:', afterDuplicate.rows[0].status);
  } catch (e) {
    console.log('Error:', e.message);
  }
  
  // Get XP after duplicate approve
  const xpAfterDuplicate = await client.query(`SELECT SUM(amount) as total FROM xp_transactions WHERE member_id = $1`, [child_id]);
  console.log('XP after duplicate approve:', xpAfterDuplicate.rows[0].total, '(should be same as before)');
  
  // TEST E: Revoke
  console.log('\n--- TEST E: Revoke ---');
  try {
    await client.query('SELECT revoke_task_approval($1, $2)', [completionId, 'Test revoke']);
    const afterRevoke = await client.query('SELECT status FROM tasks WHERE id = $1', [id]);
    console.log('After revoke - status:', afterRevoke.rows[0].status);
  } catch (e) {
    console.log('Error:', e.message);
  }
  
  // Get XP after revoke
  const xpAfterRevoke = await client.query(`SELECT SUM(amount) as total FROM xp_transactions WHERE member_id = $1`, [child_id]);
  console.log('XP after revoke:', xpAfterRevoke.rows[0].total, '(should be same as before approve)');
  
  // Check history
  const history = await client.query('SELECT action, new_status FROM task_approval_history WHERE completion_id = $1 ORDER BY created_at', [completionId]);
  console.log('\n--- History ---');
  history.rows.forEach(r => console.log(r.action + ' -> ' + r.new_status));
  
  // Cleanup
  await client.query('DELETE FROM task_completions WHERE id = $1', [completionId]);
  await client.query('DELETE FROM task_approval_history WHERE completion_id = $1', [completionId]);
  // Note: Can't delete xp_transactions due to trigger
  
  console.log('\n✅ Audit Complete');
  await client.end();
}
check();
