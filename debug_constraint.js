const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://postgres.xcbedqffmknlzjfpuwdr:uH8%2B-88pqZeUn6n@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres'
});

async function debug() {
  await client.connect();
  
  // Check if there are any triggers
  const triggers = await client.query(`
    SELECT t.tgname, t.tgtype, p.proname
    FROM pg_trigger t
    JOIN pg_proc p ON t.tgfoid = p.oid
    WHERE t.tgrelid = 'task_approval_history'::regclass
  `);
  console.log('Triggers:', triggers.rows);
  
  // Check all rows again
  const rows = await client.query('SELECT * FROM task_approval_history');
  console.log('All rows:', rows.rows);
  
  // Try to insert a test row
  try {
    await client.query(`INSERT INTO task_approval_history (completion_id, task_id, member_id, family_id, action, new_status) VALUES ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'test', 'pending')`);
    console.log('Insert succeeded');
    await client.query(`DELETE FROM task_approval_history WHERE action = 'test'`);
  } catch (e) {
    console.log('Insert failed: ' + e.message);
  }
  
  await client.end();
}
debug();
