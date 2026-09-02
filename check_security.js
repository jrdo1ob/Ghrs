const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://postgres.xcbedqffmknlzjfpuwdr:uH8%2B-88pqZeUn6n@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres'
});

async function check() {
  await client.connect();
  
  // Check RLS policies
  const policies = await client.query(`
    SELECT tablename, policyname, cmd 
    FROM pg_policies 
    WHERE schemaname = 'public' 
    ORDER BY tablename
  `);
  console.log('=== RLS Policies ===');
  policies.rows.forEach(p => console.log(p.tablename + ': ' + p.policyname + ' (' + p.cmd + ')'));
  
  // Check RPC security
  const rpcs = await client.query(`
    SELECT p.proname, p.prosecdef 
    FROM pg_proc p 
    WHERE p.proname IN ('complete_task_with_rewards', 'approve_task_completion', 'reject_task_completion', 'revoke_task_approval')
  `);
  console.log('\n=== RPC Security ===');
  rpcs.rows.forEach(r => console.log(r.proname + ': SECURITY DEFINER=' + r.prosecdef));
  
  await client.end();
}
check();
