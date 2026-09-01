const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const connectionString = 'postgresql://postgres.xcbedqffmknlzjfpuwdr:uH8%2B-88pqZeUn6n@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres';

async function runMigration() {
  const client = new Client({ connectionString });
  try {
    await client.connect();
    console.log('Connected');
    const sql = fs.readFileSync(path.join(__dirname, 'supabase', 'migrations', '021_manual_reward_penalty.sql'), 'utf8');
    await client.query(sql);
    console.log('Migration 021 applied');
    const rpcs = await client.query(`SELECT p.proname FROM pg_proc p WHERE p.proname IN ('apply_manual_adjustment', 'get_child_balance') ORDER BY p.proname`);
    console.log('RPCs:', rpcs.rows.map(r => r.proname).join(', '));
    console.log('Done!');
  } catch (e) {
    console.error('Error:', e.message);
    if (e.detail) console.error('Detail:', e.detail);
  } finally {
    await client.end();
  }
}
runMigration();
