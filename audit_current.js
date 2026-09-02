const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://postgres.xcbedqffmknlzjfpuwdr:uH8%2B-88pqZeUn6n@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres'
});

async function audit() {
  await client.connect();
  
  // Check current RPC functions
  const rpcs = await client.query(`
    SELECT p.proname, pg_get_function_arguments(p.oid) as args
    FROM pg_proc p
    WHERE p.proname IN ('complete_task_with_rewards', 'approve_task_completion', 'reject_task_completion')
    ORDER BY p.proname
  `);
  console.log('=== RPC Functions ===');
  for (const r of rpcs.rows) {
    console.log(`  ${r.proname}(${r.args})`);
  }

  // Check task_completions status values
  const statuses = await client.query(`
    SELECT DISTINCT approved FROM task_completions ORDER BY approved
  `);
  console.log('\n=== Completion Statuses ===');
  for (const s of statuses.rows) {
    console.log(`  approved=${s.approved}`);
  }

  // Check approval_history
  const history = await client.query(`
    SELECT COUNT(*) as count FROM task_approval_history
  `);
  console.log(`\n=== Approval History Records: ${history.rows[0].count} ===`);

  // Check XP transactions pattern
  const xpPattern = await client.query(`
    SELECT source, description, COUNT(*) as count, SUM(amount) as total
    FROM xp_transactions
    GROUP BY source, description
    ORDER BY count DESC
    LIMIT 10
  `);
  console.log('\n=== XP Transaction Patterns ===');
  for (const x of xpPattern.rows) {
    console.log(`  ${x.source}: "${x.description}" - ${x.count} tx, total: ${x.total}`);
  }

  await client.end();
}
audit();
