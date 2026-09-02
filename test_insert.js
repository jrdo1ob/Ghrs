const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://postgres.xcbedqffmknlzjfpuwdr:uH8%2B-88pqZeUn6n@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres'
});

async function test() {
  await client.connect();
  
  // Try to insert a row with 'revoke' action
  try {
    await client.query(`
      INSERT INTO task_approval_history (completion_id, task_id, member_id, family_id, action, new_status)
      VALUES (
        (SELECT id FROM task_completions LIMIT 1),
        (SELECT id FROM tasks LIMIT 1),
        (SELECT id FROM members WHERE role = 'child' LIMIT 1),
        (SELECT id FROM families LIMIT 1),
        'revoke',
        'pending'
      )
    `);
    console.log('Insert with revoke succeeded');
  } catch (e) {
    console.log('Insert with revoke failed: ' + e.message);
  }
  
  await client.end();
}
test();
