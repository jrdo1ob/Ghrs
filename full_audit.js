const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://postgres.xcbedqffmknlzjfpuwdr:uH8%2B-88pqZeUn6n@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres'
});

async function audit() {
  await client.connect();
  
  // 1. Check CHECK constraint on task_approval_history
  const constraints = await client.query(`
    SELECT conname, pg_get_constraintdef(oid) as def
    FROM pg_constraint
    WHERE conrelid = 'task_approval_history'::regclass
    AND contype = 'c'
  `);
  console.log('=== task_approval_history CHECK constraints ===');
  for (const c of constraints.rows) {
    console.log(`  ${c.conname}: ${c.def}`);
  }

  // 2. Check what values RPCs are trying to insert
  console.log('\n=== RPC action values used ===');
  console.log('approve_task_completion uses: "approve"');
  console.log('revoke_task_approval uses: "revoke"');
  
  // 3. Check task_completions constraints
  const tcConstraints = await client.query(`
    SELECT conname, pg_get_constraintdef(oid) as def
    FROM pg_constraint
    WHERE conrelid = 'task_completions'::regclass
  `);
  console.log('\n=== task_completions constraints ===');
  for (const c of tcConstraints.rows) {
    console.log(`  ${c.conname}: ${c.def}`);
  }

  // 4. Check RPC signatures
  const rpcs = await client.query(`
    SELECT p.proname, pg_get_function_arguments(p.oid) as args, pg_get_function_result(p.oid) as ret
    FROM pg_proc p
    WHERE p.proname IN ('complete_task_with_rewards', 'approve_task_completion', 'revoke_task_approval')
    ORDER BY p.proname, array_length(string_to_array(pg_get_function_arguments(p.oid), ','), 1)
  `);
  console.log('\n=== RPC Functions ===');
  for (const r of rpcs.rows) {
    console.log(`  ${r.proname}(${r.args}) -> ${r.ret}`);
  }

  // 5. Check task_completions data
  const completions = await client.query(`
    SELECT tc.id, tc.approved, tc.completed_at, t.title, t.requires_approval
    FROM task_completions tc
    JOIN tasks t ON tc.task_id = t.id
    ORDER BY tc.completed_at DESC
    LIMIT 10
  `);
  console.log('\n=== Recent Completions ===');
  for (const c of completions.rows) {
    console.log(`  ${c.title}: approved=${c.approved}, requires_approval=${c.requires_approval}`);
  }

  // 6. Check approval history
  const history = await client.query(`
    SELECT COUNT(*) as count FROM task_approval_history
  `);
  console.log(`\n=== Approval History: ${history.rows[0].count} records ===`);

  await client.end();
}
audit();
