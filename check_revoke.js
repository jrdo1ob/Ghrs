const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://postgres.xcbedqffmknlzjfpuwdr:uH8%2B-88pqZeUn6n@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres'
});

async function check() {
  await client.connect();
  const rpc = await client.query("SELECT proname FROM pg_proc WHERE proname = 'revoke_task_approval'");
  console.log('revoke_task_approval:', rpc.rows.length > 0 ? 'EXISTS' : 'MISSING');
  await client.end();
}
check();
