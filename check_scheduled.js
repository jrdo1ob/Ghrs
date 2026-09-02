const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://postgres.xcbedqffmknlzjfpuwdr:uH8%2B-88pqZeUn6n@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres'
});

async function checkScheduledInstance() {
  await client.connect();
  
  const rpc = await client.query(`
    SELECT pg_get_functiondef(p.oid) as def
    FROM pg_proc p
    WHERE p.proname = 'complete_scheduled_instance'
  `);
  
  console.log('=== complete_scheduled_instance ===');
  if (rpc.rows.length > 0) {
    console.log(rpc.rows[0].def);
  } else {
    console.log('Not found');
  }

  await client.end();
}
checkScheduledInstance();
