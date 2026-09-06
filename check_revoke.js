const { Client } = require('pg');
const client = new Client({
  connectionString: process.env.SUPABASE_DB_URL
});

async function check() {
  await client.connect();
  const rpc = await client.query("SELECT proname FROM pg_proc WHERE proname = 'revoke_task_approval'");
  console.log('revoke_task_approval:', rpc.rows.length > 0 ? 'EXISTS' : 'MISSING');
  await client.end();
}
check();
