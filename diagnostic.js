const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://postgres.xcbedqffmknlzjfpuwdr:uH8%2B-88pqZeUn6n@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres'
});

async function diagnostic() {
  await client.connect();
  
  // Get all tasks with their families and children
  const tasks = await client.query(`
    SELECT t.id as task_id, t.title, t.family_id, t.requires_approval, t.xp_reward, t.money_reward,
           t.is_active, t.is_deleted, t.created_by, t.frequency,
           m.id as child_id, m.name as child_name, m.family_id as child_family_id
    FROM tasks t
    LEFT JOIN members m ON m.family_id = t.family_id AND m.role = 'child'
    WHERE t.is_active = true AND t.is_deleted = false
    ORDER BY t.created_at DESC
  `);
  
  // Get current child sessions (from localStorage simulation)
  // In real app, this would come from the frontend
  // Let's check what children exist
  const children = await client.query(`
    SELECT id, name, family_id, role FROM members WHERE role = 'child'
  `);
  
  console.log('=== ALL CHILDREN ===');
  for (const c of children.rows) {
    console.log(`  ${c.name} (${c.id}) - family: ${c.family_id}`);
  }
  
  console.log('\n=== ALL TASKS WITH CHILDREN ===');
  for (const t of tasks.rows) {
    const familyMatch = t.family_id === t.child_family_id;
    console.log(`\nTask: ${t.title}`);
    console.log(`  task_id: ${t.task_id}`);
    console.log(`  family_id: ${t.family_id}`);
    console.log(`  child_id: ${t.child_id}`);
    console.log(`  child_family_id: ${t.child_family_id}`);
    console.log(`  family_match: ${familyMatch}`);
    console.log(`  requires_approval: ${t.requires_approval}`);
    console.log(`  xp_reward: ${t.xp_reward}`);
    console.log(`  created_by: ${t.created_by}`);
    console.log(`  frequency: ${t.frequency}`);
  }
  
  // Check which tasks have completions
  const completions = await client.query(`
    SELECT tc.task_id, tc.member_id, tc.approved, tc.completed_at,
           t.title, t.family_id, m.name as child_name, m.family_id as child_family_id
    FROM task_completions tc
    JOIN tasks t ON tc.task_id = t.id
    JOIN members m ON tc.member_id = m.id
    ORDER BY tc.completed_at DESC
    LIMIT 15
  `);
  
  console.log('\n=== RECENT COMPLETIONS ===');
  for (const c of completions.rows) {
    const familyMatch = c.family_id === c.child_family_id;
    console.log(`  ${c.child_name} completed "${c.title}" - approved: ${c.approved}, family_match: ${familyMatch}`);
  }
  
  await client.end();
}
diagnostic();
