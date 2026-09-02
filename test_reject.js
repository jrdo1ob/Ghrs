const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://postgres.xcbedqffmknlzjfpuwdr:uH8%2B-88pqZeUn6n@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres'
});

async function testReject() {
  await client.connect();
  
  // Get a task that requires approval
  const task = await client.query(`
    SELECT t.id, t.title, t.family_id, t.requires_approval, t.xp_reward,
           m.id as child_id, m.name as child_name
    FROM tasks t
    JOIN members m ON m.family_id = t.family_id AND m.role = 'child'
    WHERE t.is_active = true AND t.requires_approval = true
    LIMIT 1
  `);
  
  if (task.rows.length === 0) {
    console.log('No task found');
    await client.end();
    return;
  }
  
  const { id, title, child_id, child_name } = task.rows[0];
  console.log('=== REJECT TEST: ' + title + ' for ' + child_name + ' ===');
  
  // Step 1: Child completes task
  console.log('\n--- Step 1: Child Complete ---');
  try {
    await client.query('SELECT complete_task_with_rewards($1, $2)', [id, child_id]);
    console.log('✅ SUCCESS');
  } catch (e) {
    console.log('❌ ERROR: ' + e.message);
    await client.end();
    return;
  }
  
  // Get completion
  const completion = await client.query(`
    SELECT id, approved FROM task_completions
    WHERE task_id = $1 AND member_id = $2 AND completed_at::date = CURRENT_DATE
    ORDER BY completed_at DESC LIMIT 1
  `, [id, child_id]);
  
  const completionId = completion.rows[0].id;
  console.log('Completion ID: ' + completionId);
  console.log('Approved: ' + completion.rows[0].approved);
  
  // Step 2: Parent Rejects
  console.log('\n--- Step 2: Parent Reject ---');
  try {
    await client.query('SELECT reject_task_completion($1, $2)', [completionId, child_id]);
    console.log('✅ SUCCESS');
  } catch (e) {
    console.log('❌ ERROR: ' + e.message);
    await client.end();
    return;
  }
  
  // Check rejection
  const rejected = await client.query(`SELECT approved, rejected_by FROM task_completions WHERE id = $1`, [completionId]);
  console.log('Approved: ' + rejected.rows[0].approved);
  console.log('Rejected by: ' + rejected.rows[0].rejected_by);
  
  // Check Pending
  const pending = await client.query(`SELECT COUNT(*) as count FROM task_completions WHERE task_id = $1 AND approved IS NULL`, [id]);
  console.log('Pending count: ' + pending.rows[0].count);
  
  // Check XP (should be 0)
  const xp = await client.query(`SELECT SUM(amount) as total FROM xp_transactions WHERE source_id = $1`, [completionId]);
  console.log('XP awarded: ' + xp.rows[0].total);
  
  // Cleanup
  await client.query('DELETE FROM task_completions WHERE id = $1', [completionId]);
  await client.query('DELETE FROM task_approval_history WHERE completion_id = $1', [completionId]);
  
  console.log('\n✅ Reject Test Complete');
  await client.end();
}
testReject();
