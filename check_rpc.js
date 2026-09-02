const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://postgres.xcbedqffmknlzjfpuwdr:uH8%2B-88pqZeUn6n@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres'
});

async function checkRPC() {
  await client.connect();
  
  // Get all versions of complete_task_with_rewards
  const rpcs = await client.query(`
    SELECT p.oid, p.proname, pg_get_function_arguments(p.oid) as args, pg_get_function_result(p.oid) as ret,
           pg_get_functiondef(p.oid) as def
    FROM pg_proc p
    WHERE p.proname = 'complete_task_with_rewards'
    ORDER BY p.oid
  `);
  
  console.log('=== complete_task_with_rewards versions ===');
  for (const r of rpcs.rows) {
    console.log(`\nOID: ${r.oid}`);
    console.log(`Args: ${r.args}`);
    console.log(`Returns: ${r.ret}`);
    console.log(`Definition:\n${r.def.substring(0, 500)}...`);
  }
  
  await client.end();
}
checkRPC();
