const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://postgres.xcbedqffmknlzjfpuwdr:uH8%2B-88pqZeUn6n@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres'
});

async function directTest() {
  await client.connect();
  
  // Test with a specific task from Task Bank (assets/family-setup page task)
  // Let's test with "غسل اليد بعد الأكل" which was failing
  const taskId = '4edee452-0719-4794-8231-7ce8771e4261'; // غسل اليد بعد الأكل
  const childId = 'f01ddd24-f1cc-428f-965c-7dd822ee61b0'; // علي (family c56f6b79)
  
  console.log('=== Direct RPC Test ===');
  console.log(`Task ID: ${taskId}`);
  console.log(`Child ID: ${childId}`);
  
  // Get task details
  const task = await client.query(`SELECT * FROM tasks WHERE id = $1`, [taskId]);
  console.log('\nTask Details:');
  console.log(`  title: ${task.rows[0]?.title}`);
  console.log(`  family_id: ${task.rows[0]?.family_id}`);
  console.log(`  requires_approval: ${task.rows[0]?.requires_approval}`);
  
  // Get child details
  const child = await client.query(`SELECT * FROM members WHERE id = $1`, [childId]);
  console.log('\nChild Details:');
  console.log(`  name: ${child.rows[0]?.name}`);
  console.log(`  family_id: ${child.rows[0]?.family_id}`);
  console.log(`  role: ${child.rows[0]?.role}`);
  
  // Family match check
  const familyMatch = task.rows[0]?.family_id === child.rows[0]?.family_id;
  console.log(`\nFamily Match: ${familyMatch}`);
  
  // Test RPC
  console.log('\n--- Testing complete_task_with_rewards ---');
  try {
    const result = await client.query('SELECT complete_task_with_rewards($1, $2)', [taskId, childId]);
    console.log('  Result:', result.rows);
    console.log('  ✅ SUCCESS');
  } catch (e) {
    console.log('  ❌ FAILED');
    console.log(`  Error Code: ${e.code}`);
    console.log(`  Error Message: ${e.message}`);
    console.log(`  Detail: ${e.detail}`);
    console.log(`  Hint: ${e.hint}`);
  }
  
  // Check completion
  const completion = await client.query(`
    SELECT id, approved FROM task_completions
    WHERE task_id = $1 AND member_id = $2 AND completed_at::date = CURRENT_DATE
  `, [taskId, childId]);
  
  console.log('\nCompletion Status:');
  if (completion.rows.length > 0) {
    console.log(`  ID: ${completion.rows[0].id}`);
    console.log(`  Approved: ${completion.rows[0].approved}`);
    
    // Cleanup
    await client.query(`DELETE FROM task_completions WHERE id = $1`, [completion.rows[0].id]);
    await client.query(`DELETE FROM xp_transactions WHERE source_id = $1`, [completion.rows[0].id]);
  } else {
    console.log('  No completion found');
  }
  
  await client.end();
}
directTest();
