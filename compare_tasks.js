const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://postgres.xcbedqffmknlzjfpuwdr:uH8%2B-88pqZeUn6n@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres'
});

async function compare() {
  await client.connect();
  
  // Get all tasks with their completions
  const tasks = await client.query(`
    SELECT t.id, t.title, t.family_id, t.requires_approval, t.xp_reward, t.money_reward,
           t.is_active, t.is_deleted, t.is_paused, t.created_by, t.frequency,
           tc.id as completion_id, tc.approved, tc.member_id
    FROM tasks t
    LEFT JOIN task_completions tc ON t.id = tc.task_id AND tc.completed_at::date = CURRENT_DATE
    WHERE t.is_active = true AND t.is_deleted = false
    ORDER BY t.created_at DESC
  `);
  
  console.log('=== All Active Tasks ===');
  for (const t of tasks.rows) {
    console.log(`\nTask: ${t.title}`);
    console.log(`  ID: ${t.id}`);
    console.log(`  family_id: ${t.family_id}`);
    console.log(`  requires_approval: ${t.requires_approval}`);
    console.log(`  xp_reward: ${t.xp_reward}`);
    console.log(`  money_reward: ${t.money_reward}`);
    console.log(`  is_active: ${t.is_active}`);
    console.log(`  is_deleted: ${t.is_deleted}`);
    console.log(`  is_paused: ${t.is_paused}`);
    console.log(`  frequency: ${t.frequency}`);
    console.log(`  created_by: ${t.created_by}`);
    console.log(`  completion_id: ${t.completion_id}`);
    console.log(`  approved: ${t.approved}`);
  }

  // Check task_completions table structure
  const columns = await client.query(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'task_completions'
    ORDER BY ordinal_position
  `);
  console.log('\n=== task_completions columns ===');
  for (const c of columns.rows) {
    console.log(`  ${c.column_name}: ${c.data_type} (nullable: ${c.is_nullable})`);
  }

  // Check if there are any constraints
  const constraints = await client.query(`
    SELECT conname, contype, pg_get_constraintdef(oid) as def
    FROM pg_constraint
    WHERE conrelid = 'task_completions'::regclass
  `);
  console.log('\n=== task_completions constraints ===');
  for (const c of constraints.rows) {
    console.log(`  ${c.conname}: ${c.def}`);
  }

  await client.end();
}
compare();
