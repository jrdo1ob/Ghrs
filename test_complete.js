const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://postgres.xcbedqffmknlzjfpuwdr:uH8%2B-88pqZeUn6n@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres'
});

async function testComplete() {
  await client.connect();
  
  // Test each task type
  const tasks = await client.query(`
    SELECT DISTINCT t.id, t.title, t.family_id, t.requires_approval, t.xp_reward,
           m.id as child_id, m.name as child_name
    FROM tasks t
    JOIN members m ON m.family_id = t.family_id AND m.role = 'child'
    WHERE t.is_active = true AND t.is_deleted = false
    LIMIT 5
  `);
  
  for (const task of tasks.rows) {
    console.log(`\n=== Testing: ${task.title} ===`);
    console.log(`  task_id: ${task.id}`);
    console.log(`  child_id: ${task.child_id}`);
    console.log(`  family_id: ${task.family_id}`);
    
    try {
      await client.query('SELECT complete_task_with_rewards($1, $2)', [task.id, task.child_id]);
      console.log('  ✅ Success');
      
      // Get completion
      const completion = await client.query(`
        SELECT id, approved FROM task_completions
        WHERE task_id = $1 AND member_id = $2 AND completed_at::date = CURRENT_DATE
      `, [task.id, task.child_id]);
      
      if (completion.rows.length > 0) {
        console.log(`  Completion ID: ${completion.rows[0].id}`);
        console.log(`  Status: ${completion.rows[0].approved}`);
        
        // Cleanup
        await client.query(`DELETE FROM task_completions WHERE id = $1`, [completion.rows[0].id]);
        await client.query(`DELETE FROM xp_transactions WHERE source_id = $1`, [completion.rows[0].id]);
      }
    } catch (e) {
      console.log(`  ❌ Error: ${e.message}`);
    }
  }
  
  await client.end();
}
testComplete();
