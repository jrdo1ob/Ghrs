const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://postgres.xcbedqffmknlzjfpuwdr:uH8%2B-88pqZeUn6n@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres'
});

async function check() {
  await client.connect();
  
  // Check RLS policies
  const policies = await client.query(`
    SELECT policyname, cmd, qual, with_check 
    FROM pg_policies 
    WHERE tablename = 'task_completions' 
    AND schemaname = 'public'
    ORDER BY policyname
  `);
  console.log('=== task_completions Policies ===');
  for (const p of policies.rows) {
    console.log(`  ${p.policyname}: ${p.cmd}`);
    if (p.qual) console.log(`    USING: ${p.qual}`);
    if (p.with_check) console.log(`    WITH CHECK: ${p.with_check}`);
  }

  // Check recent completions
  const completions = await client.query(`
    SELECT tc.id, tc.task_id, tc.member_id, tc.approved, tc.completed_at,
           t.title, t.family_id, t.requires_approval
    FROM task_completions tc
    JOIN tasks t ON tc.task_id = t.id
    ORDER BY tc.completed_at DESC
    LIMIT 5
  `);
  console.log('\n=== Recent Completions ===');
  for (const c of completions.rows) {
    console.log(`  Task: ${c.title}`);
    console.log(`    approved: ${c.approved} (type: ${typeof c.approved})`);
    console.log(`    requires_approval: ${c.requires_approval}`);
    console.log(`    completed_at: ${c.completed_at}`);
  }

  await client.end();
}
check();
