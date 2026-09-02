const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://postgres.xcbedqffmknlzjfpuwdr:uH8%2B-88pqZeUn6n@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres'
});

async function deepCheck() {
  await client.connect();
  
  // Check ALL constraints on task_completions
  const constraints = await client.query(`
    SELECT conname, contype, pg_get_constraintdef(oid) as def
    FROM pg_constraint
    WHERE conrelid = 'task_completions'::regclass
  `);
  console.log('=== ALL Constraints ===');
  for (const c of constraints.rows) {
    console.log(`  ${c.conname}: ${c.def}`);
  }

  // Check indexes
  const indexes = await client.query(`
    SELECT indexname, indexdef
    FROM pg_indexes
    WHERE tablename = 'task_completions'
  `);
  console.log('\n=== Indexes ===');
  for (const i of indexes.rows) {
    console.log(`  ${i.indexname}: ${i.indexdef}`);
  }

  // Check if there's a unique constraint on (task_id, member_id)
  const uniqueConstraint = await client.query(`
    SELECT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conrelid = 'task_completions'::regclass
      AND contype = 'u'
    ) as has_unique
  `);
  console.log(`\n=== Has unique constraint: ${uniqueConstraint.rows[0].has_unique} ===`);

  // Try to insert a duplicate completion manually
  const testTask = await client.query(`
    SELECT id FROM tasks WHERE is_active = true AND is_deleted = false LIMIT 1
  `);
  
  if (testTask.rows.length > 0) {
    const taskId = testTask.rows[0].id;
    console.log(`\n=== Testing insert for task: ${taskId} ===`);
    
    try {
      const result = await client.query(`
        INSERT INTO task_completions (task_id, member_id, approved)
        VALUES ($1, '00000000-0000-0000-0000-000000000000', false)
        ON CONFLICT DO NOTHING
        RETURNING id
      `, [taskId]);
      
      if (result.rows.length > 0) {
        console.log(`  Insert succeeded: ${result.rows[0].id}`);
        // Clean up
        await client.query(`DELETE FROM task_completions WHERE id = $1`, [result.rows[0].id]);
      } else {
        console.log('  Insert returned NULL (conflict or error)');
      }
    } catch (e) {
      console.log(`  Insert failed: ${e.message}`);
    }
  }

  await client.end();
}
deepCheck();
