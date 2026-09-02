const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://postgres.xcbedqffmknlzjfpuwdr:uH8%2B-88pqZeUn6n@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres'
});

async function test() {
  await client.connect();
  
  // Get a task with requires_approval=true
  const task = await client.query(`
    SELECT t.id, t.title, t.family_id, m.id as child_id, m.name as child_name
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
  console.log('Testing: ' + title + ' for ' + child_name);
  
  try {
    await client.query('SELECT complete_task_with_rewards($1, $2)', [id, child_id]);
    console.log('SUCCESS');
    
    const completion = await client.query(`
      SELECT id, approved FROM task_completions
      WHERE task_id = $1 AND member_id = $2 AND completed_at::date = CURRENT_DATE
    `, [id, child_id]);
    
    if (completion.rows.length > 0) {
      console.log('Completion ID: ' + completion.rows[0].id);
      console.log('Approved: ' + completion.rows[0].approved);
      console.log('Is NULL: ' + (completion.rows[0].approved === null));
      
      // Cleanup
      await client.query('DELETE FROM task_completions WHERE id = $1', [completion.rows[0].id]);
      await client.query('DELETE FROM xp_transactions WHERE source_id = $1', [completion.rows[0].id]);
    }
  } catch (e) {
    console.log('ERROR: ' + e.message);
  }
  
  await client.end();
}
test();
