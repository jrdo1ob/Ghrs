const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://postgres.xcbedqffmknlzjfpuwdr:uH8%2B-88pqZeUn6n@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres'
});

async function checkAllRPCs() {
  await client.connect();
  
  // Find all RPCs that have p_completion_id
  const rpcs = await client.query(`
    SELECT p.proname, pg_get_function_arguments(p.oid) as args
    FROM pg_proc p
    WHERE pg_get_function_arguments(p.oid) LIKE '%p_completion_id%'
    ORDER BY p.proname
  `);
  
  console.log('=== RPCs with p_completion_id ===');
  for (const r of rpcs.rows) {
    console.log(`  ${r.proname}(${r.args})`);
  }

  // Check if there's a trigger or function that might be interfering
  const triggers = await client.query(`
    SELECT t.tgname, t.tgtype, p.proname
    FROM pg_trigger t
    JOIN pg_proc p ON t.tgfoid = p.oid
    WHERE t.tgrelid = 'task_completions'::regclass
  `);
  console.log('\n=== Triggers on task_completions ===');
  for (const t of triggers.rows) {
    console.log(`  ${t.tgname}: ${t.proname}`);
  }

  await client.end();
}
checkAllRPCs();
