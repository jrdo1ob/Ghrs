const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://postgres.xcbedqffmknlzjfpuwdr:uH8%2B-88pqZeUn6n@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres'
});

async function checkTriggers() {
  await client.connect();
  
  // Check trigger functions
  const triggers = await client.query(`
    SELECT p.proname, pg_get_functiondef(p.oid) as def
    FROM pg_proc p
    WHERE p.proname IN ('trigger_update_streak', 'trigger_update_streak_insert')
  `);
  
  console.log('=== Trigger Functions ===');
  for (const t of triggers.rows) {
    console.log(`\n${t.proname}:`);
    console.log(t.def);
  }

  await client.end();
}
checkTriggers();
