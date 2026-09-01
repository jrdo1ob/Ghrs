const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const connectionString = 'postgresql://postgres.xcbedqffmknlzjfpuwdr:uH8%2B-88pqZeUn6n@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres';

async function runMigration() {
  const client = new Client({ connectionString });
  try {
    await client.connect();
    console.log('Connected');
    const sql = fs.readFileSync(path.join(__dirname, 'supabase', 'migrations', '024_add_icon_fields.sql'), 'utf8');
    await client.query(sql);
    console.log('Migration 024 applied');
    
    // Verify
    const taskIcon = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_name='tasks' AND column_name='icon'`);
    console.log('tasks.icon:', taskIcon.rows.length > 0 ? '✅' : '❌');
    
    const giftIcon = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_name='gifts' AND column_name='icon'`);
    console.log('gifts.icon:', giftIcon.rows.length > 0 ? '✅' : '❌');
    
    console.log('Done!');
  } catch (e) {
    console.error('Error:', e.message);
    if (e.detail) console.error('Detail:', e.detail);
  } finally {
    await client.end();
  }
}
runMigration();
