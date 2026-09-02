const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://postgres.xcbedqffmknlzjfpuwdr:uH8%2B-88pqZeUn6n@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres'
});

async function fullAudit() {
  await client.connect();
  
  // 1. Check RPC definitions
  console.log('=== 1. RPC DEFINITIONS ===');
  const rpcs = await client.query(`
    SELECT p.proname, pg_get_function_arguments(p.oid) as args, pg_get_function_result(p.oid) as ret
    FROM pg_proc p
    WHERE p.proname IN ('complete_task_with_rewards', 'approve_task_completion', 'revoke_task_completion', 'reject_task_completion')
    GROUP BY p.proname, p.oid
    ORDER BY p.proname
  `);
  for (const r of rpcs.rows) {
    console.log(`  ${r.proname}(${r.args}) -> ${r.ret}`);
  }

  // 2. Check task_completions data
  console.log('\n=== 2. TASK COMPLETIONS ===');
  const completions = await client.query(`
    SELECT tc.id, tc.approved, tc.completed_at, tc.approved_by, tc.approved_at,
           t.title, t.family_id, t.requires_approval, t.xp_reward,
           m.name as child_name, m.family_id as child_family_id
    FROM task_completions tc
    JOIN tasks t ON tc.task_id = t.id
    JOIN members m ON tc.member_id = m.id
    ORDER BY tc.completed_at DESC
    LIMIT 10
  `);
  for (const c of completions.rows) {
    console.log(`  ${c.child_name} | ${c.title} | approved=${c.approved} | ${c.completed_at}`);
  }

  // 3. Check approval history
  console.log('\n=== 3. APPROVAL HISTORY ===');
  const history = await client.query(`
    SELECT action, COUNT(*) as count FROM task_approval_history GROUP BY action
  `);
  console.log(`  Total records: ${history.rows.reduce((sum, r) => sum + parseInt(r.count), 0)}`);
  for (const h of history.rows) {
    console.log(`  ${h.action}: ${h.count}`);
  }

  // 4. Check XP transactions
  console.log('\n=== 4. XP TRANSACTIONS ===');
  const xp = await client.query(`
    SELECT source, description, SUM(amount) as total, COUNT(*) as count
    FROM xp_transactions
    GROUP BY source, description
    ORDER BY count DESC
    LIMIT 10
  `);
  for (const x of xp.rows) {
    console.log(`  ${x.source}: "${x.description}" - ${x.count} tx, total: ${x.total}`);
  }

  // 5. Check approval history columns
  console.log('\n=== 5. APPROVAL HISTORY SCHEMA ===');
  const ahCols = await client.query(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'task_approval_history'
    ORDER BY ordinal_position
  `);
  for (const c of ahCols.rows) {
    console.log(`  ${c.column_name}: ${c.data_type} (nullable: ${c.is_nullable})`);
  }

  // 6. Check complete_task_with_rewards RPC definition
  console.log('\n=== 6. COMPLETE_TASK_WITH_REWARDS RPC ===');
  const rpc = await client.query(`
    SELECT pg_get_functiondef(p.oid) as def
    FROM pg_proc p
    WHERE p.proname = 'complete_task_with_rewards'
  `);
  console.log(rpc.rows[0]?.def);

  await client.end();
}
fullAudit();
