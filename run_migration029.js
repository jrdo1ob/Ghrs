const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const connectionString = 'postgresql://postgres.xcbedqffmknlzjfpuwdr:uH8%2B-88pqZeUn6n@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres';

async function runMigration() {
  const client = new Client({ connectionString });
  try {
    await client.connect();
    console.log('Connected');
    const sql = fs.readFileSync(path.join(__dirname, 'supabase', 'migrations', '029_cleanup_rpcs.sql'), 'utf8');
    await client.query(sql);
    console.log('Migration 029 applied');
    
    // Verify
    const rpcs = await client.query(`
      SELECT p.proname, pg_get_function_arguments(p.oid) as args
      FROM pg_proc p
      WHERE p.proname = 'approve_task_completion'
    `);
    console.log('approve_task_completion versions:', rpcs.rows.length);
    for (const r of rpcs.rows) {
      console.log(`  ${r.proname}(${r.args})`);
    }
    
    console.log('Done!');
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await client.end();
  }
}
runMigration();
