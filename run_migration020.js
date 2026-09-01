const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const connectionString = 'postgresql://postgres.xcbedqffmknlzjfpuwdr:uH8%2B-88pqZeUn6n@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres';

async function runMigration() {
  const client = new Client({ connectionString });
  try {
    await client.connect();
    console.log('Connected');
    const sql = fs.readFileSync(path.join(__dirname, 'supabase', 'migrations', '020_reward_presets_bank.sql'), 'utf8');
    await client.query(sql);
    console.log('Migration 020 applied');
    const count = await client.query('SELECT COUNT(*) as cnt FROM reward_presets');
    console.log('Reward presets:', count.rows[0].cnt);
    const cats = await client.query('SELECT category, COUNT(*) as cnt FROM reward_presets GROUP BY category ORDER BY category');
    console.log('Categories:', cats.rows.map(r => r.category + ':' + r.cnt).join(', '));
    console.log('Done!');
  } catch (e) {
    console.error('Error:', e.message);
    if (e.detail) console.error('Detail:', e.detail);
  } finally {
    await client.end();
  }
}
runMigration();
