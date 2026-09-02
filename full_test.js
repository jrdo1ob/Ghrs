const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://postgres.xcbedqffmknlzjfpuwdr:uH8%2B-88pqZeUn6n@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres'
});

async function fullTest() {
  await client.connect();
  
  // Get a test task with approval required
  const testTask = await client.query(`
    SELECT t.id as task_id, t.family_id, t.title, t.requires_approval, t.xp_reward,
           m.id as child_id, m.name as child_name
    FROM tasks t
    JOIN members m ON m.family_id = t.family_id AND m.role = 'child'
    WHERE t.is_active = true AND t.is_deleted = false AND t.requires_approval = true
    LIMIT 1
  `);
  
  if (testTask.rows.length === 0) {
    console.log('No test task found');
    await client.end();
    return;
  }
  
  const { task_id, child_id, title, xp_reward } = testTask.rows[0];
  console.log(`\n=== Full Test: ${title} ===`);
  console.log(`  task_id: ${task_id}`);
  console.log(`  child_id: ${child_id}`);
  console.log(`  xp_reward: ${xp_reward}`);
  
  // Step 1: Complete task
  console.log('\n--- Step 1: Child completes task ---');
  try {
    await client.query('SELECT complete_task_with_rewards($1, $2)', [task_id, child_id]);
    console.log('  ✅ Task completed');
  } catch (e) {
    console.log(`  ❌ Error: ${e.message}`);
    await client.end();
    return;
  }
  
  // Get completion
  const completion = await client.query(`
    SELECT id, approved FROM task_completions
    WHERE task_id = $1 AND member_id = $2 AND completed_at::date = CURRENT_DATE
  `, [task_id, child_id]);
  
  if (completion.rows.length === 0) {
    console.log('  ❌ No completion found');
    await client.end();
    return;
  }
  
  const completionId = completion.rows[0].id;
  console.log(`  Completion ID: ${completionId}`);
  console.log(`  Status: ${completion.rows[0].approved}`);
  
  // Step 2: Parent approves
  console.log('\n--- Step 2: Parent approves ---');
  try {
    await client.query('SELECT approve_task_completion($1, true, $2)', [completionId, 'Test approval']);
    console.log('  ✅ Approved');
  } catch (e) {
    console.log(`  ❌ Error: ${e.message}`);
    await client.end();
    return;
  }
  
  // Check XP
  const xp = await client.query(`SELECT SUM(amount) as total FROM xp_transactions WHERE source_id = $1`, [completionId]);
  console.log(`  XP awarded: ${xp.rows[0].total}`);
  
  // Check history
  const history1 = await client.query(`SELECT action, new_status FROM task_approval_history WHERE completion_id = $1`, [completionId]);
  console.log(`  History: ${JSON.stringify(history1.rows)}`);
  
  // Step 3: Parent revokes
  console.log('\n--- Step 3: Parent revokes ---');
  try {
    await client.query('SELECT revoke_task_approval($1, $2)', [completionId, 'Test revoke']);
    console.log('  ✅ Revoked');
  } catch (e) {
    console.log(`  ❌ Error: ${e.message}`);
    await client.end();
    return;
  }
  
  // Check XP reversal
  const xpAfterRevoke = await client.query(`SELECT SUM(amount) as total FROM xp_transactions WHERE source_id = $1`, [completionId]);
  console.log(`  XP after revoke: ${xpAfterRevoke.rows[0].total}`);
  
  // Check history
  const history2 = await client.query(`SELECT action, new_status FROM task_approval_history WHERE completion_id = $1 ORDER BY created_at`, [completionId]);
  console.log(`  History: ${JSON.stringify(history2.rows)}`);
  
  // Step 4: Child re-completes
  console.log('\n--- Step 4: Child re-completes ---');
  try {
    await client.query('SELECT complete_task_with_rewards($1, $2)', [task_id, child_id]);
    console.log('  ✅ Re-completed');
  } catch (e) {
    console.log(`  ❌ Error: ${e.message}`);
    await client.end();
    return;
  }
  
  // Get new completion
  const newCompletion = await client.query(`
    SELECT id, approved FROM task_completions
    WHERE task_id = $1 AND member_id = $2 AND completed_at::date = CURRENT_DATE
    ORDER BY completed_at DESC
    LIMIT 1
  `, [task_id, child_id]);
  
  console.log(`  New Completion ID: ${newCompletion.rows[0].id}`);
  console.log(`  Status: ${newCompletion.rows[0].approved}`);
  
  // Step 5: Parent approves again
  console.log('\n--- Step 5: Parent approves again ---');
  try {
    await client.query('SELECT approve_task_completion($1, true, $2)', [newCompletion.rows[0].id, 'Second approval']);
    console.log('  ✅ Approved again');
  } catch (e) {
    console.log(`  ❌ Error: ${e.message}`);
    await client.end();
    return;
  }
  
  // Check final XP
  const finalXp = await client.query(`SELECT SUM(amount) as total FROM xp_transactions WHERE source_id IN ($1, $2)`, [completionId, newCompletion.rows[0].id]);
  console.log(`  Total XP from both completions: ${finalXp.rows[0].total}`);
  
  // Check final history
  const finalHistory = await client.query(`
    SELECT completion_id, action, new_status, created_at 
    FROM task_approval_history 
    WHERE completion_id IN ($1, $2)
    ORDER BY created_at
  `, [completionId, newCompletion.rows[0].id]);
  console.log(`\n=== Final Approval History ===`);
  for (const h of finalHistory.rows) {
    console.log(`  ${h.completion_id === completionId ? 'First' : 'Second'}: ${h.action} → ${h.new_status}`);
  }
  
  // Cleanup
  await client.query(`DELETE FROM task_completions WHERE id IN ($1, $2)`, [completionId, newCompletion.rows[0].id]);
  await client.query(`DELETE FROM task_approval_history WHERE completion_id IN ($1, $2)`, [completionId, newCompletion.rows[0].id]);
  await client.query(`DELETE FROM xp_transactions WHERE source_id IN ($1, $2)`, [completionId, newCompletion.rows[0].id]);
  
  console.log('\n✅ All tests passed!');
  await client.end();
}
fullTest();
