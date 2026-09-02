const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://postgres.xcbedqffmknlzjfpuwdr:uH8%2B-88pqZeUn6n@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres'
});

async function audit() {
  await client.connect();
  
  // 1. Task Completions structure
  const completions = await client.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'task_completions' 
    ORDER BY ordinal_position
  `);
  console.log('=== task_completions columns ===');
  for (const c of completions.rows) {
    console.log(`  ${c.column_name}: ${c.data_type}`);
  }

  // 2. XP Transactions structure
  const xp = await client.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'xp_transactions' 
    ORDER BY ordinal_position
  `);
  console.log('\n=== xp_transactions columns ===');
  for (const c of xp.rows) {
    console.log(`  ${c.column_name}: ${c.data_type}`);
  }

  // 3. Money Transactions structure
  const money = await client.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'money_transactions' 
    ORDER BY ordinal_position
  `);
  console.log('\n=== money_transactions columns ===');
  for (const c of money.rows) {
    console.log(`  ${c.column_name}: ${c.data_type}`);
  }

  // 4. Check if approval_history exists
  const history = await client.query(`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_name = 'task_approval_history'
    ) as exists
  `);
  console.log(`\n=== task_approval_history exists: ${history.rows[0].exists} ===`);

  // 5. Check recent approvals
  const approvals = await client.query(`
    SELECT tc.id, tc.approved, tc.approved_by, tc.approved_at,
           t.title, t.xp_reward, t.money_reward
    FROM task_completions tc
    JOIN tasks t ON tc.task_id = t.id
    WHERE tc.approved IS NOT NULL
    ORDER BY tc.approved_at DESC
    LIMIT 5
  `);
  console.log('\n=== Recent Approvals ===');
  for (const a of approvals.rows) {
    console.log(`  Task: ${a.title}`);
    console.log(`    approved: ${a.approved}, by: ${a.approved_by}`);
    console.log(`    XP: ${a.xp_reward}, Money: ${a.money_reward}`);
  }

  // 6. Check XP transactions related to approvals
  const xpTx = await client.query(`
    SELECT xpt.id, xpt.member_id, xpt.amount, xpt.source, xpt.description
    FROM xp_transactions xpt
    WHERE xpt.source = 'task'
    ORDER BY xpt.created_at DESC
    LIMIT 5
  `);
  console.log('\n=== XP Transactions (task source) ===');
  for (const x of xpTx.rows) {
    console.log(`  Amount: ${x.amount}, Source: ${x.source}, Desc: ${x.description}`);
  }

  await client.end();
}
audit();
