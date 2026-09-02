const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://postgres.xcbedqffmknlzjfpuwdr:uH8%2B-88pqZeUn6n@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres'
});

async function testRPC() {
  await client.connect();
  
  // Get a test task and child
  const testTask = await client.query(`
    SELECT t.id as task_id, t.family_id, t.title, t.requires_approval,
           m.id as child_id
    FROM tasks t
    JOIN members m ON m.family_id = t.family_id AND m.role = 'child'
    WHERE t.is_active = true AND t.is_deleted = false
    LIMIT 1
  `);
  
  if (testTask.rows.length === 0) {
    console.log('No test task found');
    await client.end();
    return;
  }
  
  const { task_id, child_id, title, requires_approval } = testTask.rows[0];
  console.log(`\n=== Testing Task: ${title} ===`);
  console.log(`  task_id: ${task_id}`);
  console.log(`  child_id: ${child_id}`);
  console.log(`  requires_approval: ${requires_approval}`);
  
  // Test complete_task_with_rewards
  console.log('\n--- Testing complete_task_with_rewards ---');
  try {
    await client.query('SELECT complete_task_with_rewards($1, $2)', [task_id, child_id]);
    console.log('  ✅ Success');
  } catch (e) {
    console.log(`  ❌ Error: ${e.message}`);
  }
  
  // Check if completion was created
  const completion = await client.query(`
    SELECT id, approved FROM task_completions
    WHERE task_id = $1 AND member_id = $2 AND completed_at::date = CURRENT_DATE
  `, [task_id, child_id]);
  
  if (completion.rows.length > 0) {
    console.log(`  Completion created: ${completion.rows[0].id}`);
    console.log(`  approved: ${completion.rows[0].approved}`);
    
    // Test approve_task_completion
    console.log('\n--- Testing approve_task_completion ---');
    try {
      await client.query('SELECT approve_task_completion($1, true)', [completion.rows[0].id]);
      console.log('  ✅ Success');
    } catch (e) {
      console.log(`  ❌ Error: ${e.message}`);
    }
    
    // Check approval history
    const history = await client.query(`
      SELECT action, new_status FROM task_approval_history
      WHERE completion_id = $1
    `, [completion.rows[0].id]);
    console.log(`  History: ${JSON.stringify(history.rows)}`);
    
    // Test revoke_task_approval
    console.log('\n--- Testing revoke_task_approval ---');
    try {
      await client.query('SELECT revoke_task_approval($1, $2)', [completion.rows[0].id, 'Test revoke']);
      console.log('  ✅ Success');
    } catch (e) {
      console.log(`  ❌ Error: ${e.message}`);
    }
    
    // Check final history
    const finalHistory = await client.query(`
      SELECT action, new_status FROM task_approval_history
      WHERE completion_id = $1
      ORDER BY created_at
    `, [completion.rows[0].id]);
    console.log(`  Final History: ${JSON.stringify(finalHistory.rows)}`);
    
    // Cleanup
    await client.query(`DELETE FROM task_completions WHERE id = $1`, [completion.rows[0].id]);
    await client.query(`DELETE FROM task_approval_history WHERE completion_id = $1`, [completion.rows[0].id]);
    await client.query(`DELETE FROM xp_transactions WHERE source_id = $1`, [completion.rows[0].id]);
  } else {
    console.log('  ❌ No completion found');
  }
  
  await client.end();
}
testRPC();
