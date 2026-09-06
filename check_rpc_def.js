const { Client } = require('pg');
const client = new Client({
  connectionString: process.env.SUPABASE_DB_URL
});

async function check() {
  await client.connect();
  const rpc = await client.query(`
    SELECT pg_get_functiondef(p.oid) as def
    FROM pg_proc p
    WHERE p.proname = 'complete_task_with_rewards'
  `);
  console.log(rpc.rows[0].def);
  await client.end();
}
check();
