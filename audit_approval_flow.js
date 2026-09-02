const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://postgres.xcbedqffmknlzjfpuwdr:uH8%2B-88pqZeUn6n@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres'
});

async function audit() {
  await client.connect();
  
  // 1. Check completions
  const c = await client.query(`
    SELECT tc.id, tc.approved, tc.completed_at, tc.member_id,
           t.title, t.family_id, t.requires_approval,
           m.name as child_name, m.family_id as child_family_id
    FROM task_completions tc
    JOIN tasks t ON tc.task_id = t.id
    JOIN members m ON tc.member_id = m.id
    ORDER BY tc.completed_at DESC
    LIMIT 10
  `);
  console.log('=== COMPLETIONS ===');
  for (const r of c.rows) {
    console.log(`  ${r.child_name} | ${r.title} | approved=${r.approved} | family_match=${r.family_id === r.child_family_id}`);
  }

  // 2. Pending count
  const p = await client.query(`SELECT COUNT(*) as count FROM task_completions WHERE approved IS NULL`);
  console.log('\nPENDING (approved IS NULL): ' + p.rows[0].count);

  // 3. Approved count
  const a = await client.query(`SELECT COUNT(*) as count FROM task_completions WHERE approved = true`);
  console.log('APPROVED (approved=true): ' + a.rows[0].count);

  // 4. Rejected count
  const r = await client.query(`SELECT COUNT(*) as count FROM task_completions WHERE approved = false`);
  console.log('REJECTED (approved=false): ' + r.rows[0].count);

  // 5. Check dashboard query
  const tasks = await client.query(`SELECT id FROM tasks WHERE is_active = true AND is_deleted = false`);
  const taskIds = tasks.rows.map(t => t.id);
  if (taskIds.length > 0) {
    const pending = await client.query(`SELECT COUNT(*) as count FROM task_completions WHERE approved IS NULL AND task_id = ANY($1)`, [taskIds]);
    console.log('\nDASHBOARD PENDING: ' + pending.rows[0].count);
  }

  // 6. Check approval history
  const h = await client.query(`SELECT action, COUNT(*) as count FROM task_approval_history GROUP BY action`);
  console.log('\nAPPROVAL HISTORY:');
  h.rows.forEach(r => console.log(`  ${r.action}: ${r.count}`));

  await client.end();
}
audit();
