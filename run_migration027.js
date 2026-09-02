const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const connectionString = 'postgresql://postgres.xcbedqffmknlzjfpuwdr:uH8%2B-88pqZeUn6n@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres';

async function runMigration() {
  const client = new Client({ connectionString });
  try {
    await client.connect();
    console.log('Connected');
    const sql = fs.readFileSync(path.join(__dirname, 'supabase', 'migrations', '027_revoke_approval.sql'), 'utf8');
    await client.query(sql);
    console.log('Migration 027 applied');
    
    // Verify
    const rpc = await client.query(`SELECT proname FROM pg_proc WHERE proname = 'revoke_task_approval'`);
    console.log('revoke_task_approval:', rpc.rows.length > 0 ? '✅' : '❌');
    
    console.log('Done!');
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await client.end();
  }
}
runMigration();
