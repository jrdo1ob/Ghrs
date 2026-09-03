const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://postgres.xcbedqffmknlzjfpuwdr:uH8%2B-88pqZeUn6n@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres'
});

async function testProduction() {
  await client.connect();
  
  // Get a test task
  const task = await client.query(`
    SELECT t.id, t.title, t.xp_reward, m.id as child_id, m.name as child_name
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
  
  const { id, title, xp_reward, child_id, child_name } = task.rows[0];
  console.log('=== PRODUCTION TEST: ' + title + ' for ' + child_name + ' ===');
  
  // Test 1: Child Complete
  console.log('\n--- Test 1: Child Complete ---');
  try {
    await client.query('SELECT complete_task_with_rewards($1, $2)', [id, child_id]);
    console.log('✅ SUCCESS');
  } catch (e) {
    console.log('❌ ERROR: ' + e.message);
    await client.end();
    return;
  }
  
  const completion = await client.query(`
    SELECT id, approved FROM task_completions
    WHERE task_id = $1 AND member_id = $2 AND completed_at::date = CURRENT_DATE
    ORDER BY completed_at DESC LIMIT 1
  `, [id, child_id]);
  
  const completionId = completion.rows[0].id;
  console.log('Completion ID: ' + completionId);
  console.log('Approved: ' + completion.rows[0].approved + ' (should be NULL)');
  
  // Test 2: Parent Approve
  console.log('\n--- Test 2: Parent Approve ---');
  try {
    await client.query('SELECT approve_task_completion($1, true, $2)', [completionId, 'Test approve']);
    console.log('✅ SUCCESS');
  } catch (e) {
    console.log('❌ ERROR: ' + e.message);
    await client.end();
    return;
  }
  
  const approved = await client.query(`SELECT approved FROM task_completions WHERE id = $1`, [completionId]);
  console.log('Approved: ' + approved.rows[0].approved + ' (should be TRUE)');
  
  const xp = await client.query(`SELECT SUM(amount) as total FROM xp_transactions WHERE source_id = $1`, [completionId]);
  console.log('XP: ' + xp.rows[0].total + ' (should be ' + xp_reward + ')');
  
  // Test 3: Parent Revoke
  console.log('\n--- Test 3: Parent Revoke ---');
  try {
    await client.query('SELECT revoke_task_approval($1, $2)', [completionId, 'Test revoke']);
    console.log('✅ SUCCESS');
  } catch (e) {
    console.log('❌ ERROR: ' + e.message);
    await client.end();
    return;
  }
  
  const revoked = await client.query(`SELECT approved FROM task_completions WHERE id = $1`, [completionId]);
  console.log('Approved: ' + revoked.rows[0].approved + ' (should be NULL)');
  
  const xpAfterRevoke = await client.query(`SELECT SUM(amount) as total FROM xp_transactions WHERE source_id = $1`, [completionId]);
  console.log('XP after revoke: ' + xpAfterRevoke.rows[0].total + ' (should be 0)');
  
  // Cleanup
  await client.query('DELETE FROM task_completions WHERE id = $1', [completionId]);
  await client.query('DELETE FROM task_approval_history WHERE completion_id = $1', [completionId]);
  await client.query('DELETE FROM xp_transactions WHERE source_id = $1', [completionId]);
  
  console.log('\n✅ Production Test Complete');
  await client.end();
}
testProduction();
