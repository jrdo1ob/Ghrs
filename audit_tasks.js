const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://postgres.xcbedqffmknlzjfpuwdr:uH8%2B-88pqZeUn6n@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres'
});

async function audit() {
  await client.connect();
  
  // Get all tasks with their families and children
  const tasks = await client.query(`
    SELECT t.id, t.title, t.family_id, t.requires_approval, t.xp_reward, t.money_reward,
           t.is_active, t.is_deleted, t.is_paused, t.created_by, t.frequency,
           m.id as child_id, m.name as child_name
    FROM tasks t
    LEFT JOIN members m ON m.family_id = t.family_id AND m.role = 'child'
    WHERE t.is_active = true AND t.is_deleted = false
    ORDER BY t.created_at DESC
  `);
  
  console.log('=== All Active Tasks with Children ===');
  for (const t of tasks.rows) {
    console.log(`\nTask: ${t.title}`);
    console.log(`  ID: ${t.id}`);
    console.log(`  family_id: ${t.family_id}`);
    console.log(`  child_id: ${t.child_id}`);
    console.log(`  child_name: ${t.child_name}`);
    console.log(`  requires_approval: ${t.requires_approval}`);
    console.log(`  xp_reward: ${t.xp_reward}`);
    console.log(`  money_reward: ${t.money_reward}`);
    console.log(`  frequency: ${t.frequency}`);
    console.log(`  created_by: ${t.created_by}`);
  }

  // Check completions
  const completions = await client.query(`
    SELECT tc.id, tc.task_id, tc.member_id, tc.approved, tc.completed_at,
           t.title, t.family_id, m.name as child_name
    FROM task_completions tc
    JOIN tasks t ON tc.task_id = t.id
    JOIN members m ON tc.member_id = m.id
    ORDER BY tc.completed_at DESC
    LIMIT 10
  `);
  console.log('\n=== Recent Completions ===');
  for (const c of completions.rows) {
    console.log(`  ${c.child_name} completed "${c.title}" - approved: ${c.approved}`);
  }

  await client.end();
}
audit();
