const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const connectionString = 'postgresql://postgres.xcbedqffmknlzjfpuwdr:uH8%2B-88pqZeUn6n@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres';

async function runMigration() {
  const client = new Client({ connectionString });
  try {
    await client.connect();
    console.log('Connected');
    const sql = fs.readFileSync(path.join(__dirname, 'supabase', 'migrations', '026_approval_history.sql'), 'utf8');
    await client.query(sql);
    console.log('Migration 026 applied');
    
    // Verify
    const table = await client.query(`SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name='task_approval_history') as exists`);
    console.log('task_approval_history:', table.rows[0].exists ? '✅' : '❌');
    
    console.log('Done!');
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await client.end();
  }
}
runMigration();
