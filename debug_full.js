const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://postgres.xcbedqffmknlzjfpuwdr:uH8%2B-88pqZeUn6n@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres'
});

async function debug() {
  await client.connect();
  
  // Check all constraints on the table
  const constraints = await client.query(`
    SELECT conname, contype, pg_get_constraintdef(oid) as def
    FROM pg_constraint
    WHERE conrelid = 'task_approval_history'::regclass
  `);
  console.log('All constraints:', constraints.rows);
  
  // Check all indexes
  const indexes = await client.query(`
    SELECT indexname, indexdef
    FROM pg_indexes
    WHERE tablename = 'task_approval_history'
  `);
  console.log('Indexes:', indexes.rows);
  
  // Check all triggers
  const triggers = await client.query(`
    SELECT t.tgname, t.tgtype, p.proname
    FROM pg_trigger t
    JOIN pg_proc p ON t.tgfoid = p.oid
    WHERE t.tgrelid = 'task_approval_history'::regclass
  `);
  console.log('Triggers:', triggers.rows);
  
  await client.end();
}
debug();
