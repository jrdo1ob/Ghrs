const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const connectionString = 'postgresql://postgres.xcbedqffmknlzjfpuwdr:uH8%2B-88pqZeUn6n@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres';

async function runMigration() {
  const client = new Client({ connectionString });
  try {
    await client.connect();
    console.log('Connected');
    const sql = fs.readFileSync(path.join(__dirname, 'supabase', 'migrations', '033_task_recurrence.sql'), 'utf8');
    await client.query(sql);
    console.log('Migration 033 applied');
    
    // Verify
    const cols = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_name='tasks' AND column_name IN ('last_completed_at', 'recurrence_reset_at')`);
    console.log('New columns:', cols.rows.map(r => r.column_name).join(', '));
    
    const tz = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_name='families' AND column_name='timezone'`);
    console.log('Timezone column:', tz.rows.length > 0 ? '✅' : '❌');
    
    const rpcs = await client.query(`SELECT proname FROM pg_proc WHERE proname IN ('is_task_available', 'get_available_tasks')`);
    console.log('RPCs:', rpcs.rows.map(r => r.proname).join(', '));
    
    console.log('Done!');
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await client.end();
  }
}
runMigration();
