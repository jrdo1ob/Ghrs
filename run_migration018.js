const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const connectionString = 'postgresql://postgres.xcbedqffmknlzjfpuwdr:uH8%2B-88pqZeUn6n@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres';

async function runMigration() {
  const client = new Client({ connectionString });
  try {
    await client.connect();
    console.log('✅ Connected');

    const migrationPath = path.join(__dirname, 'supabase', 'migrations', '018_task_management_stories.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    await client.query(sql);
    console.log('✅ Migration 018 applied');

    // Verify
    const tasks = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_name='tasks' AND column_name IN ('priority','schedule_days','is_paused') ORDER BY column_name`);
    console.log('\n📋 New task columns:', tasks.rows.map(r => r.column_name).join(', '));

    const stories = await client.query(`SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name='stories') as exists`);
    console.log('📖 Stories table:', stories.rows[0].exists ? '✅ exists' : '❌ missing');

    const presets = await client.query(`SELECT COUNT(*) as cnt FROM preset_stories`);
    console.log('📚 Preset stories:', presets.rows[0].cnt);

    const rpcs = await client.query(`SELECT p.proname FROM pg_proc p WHERE p.proname IN ('update_task','delete_task','toggle_task_pause','create_story','add_preset_story','delete_story') ORDER BY p.proname`);
    console.log('🔧 RPCs:', rpcs.rows.map(r => r.proname).join(', '));

    console.log('\n🎉 Done!');
  } catch (e) {
    console.error('❌', e.message);
    if (e.detail) console.error('Detail:', e.detail);
  } finally {
    await client.end();
  }
}
runMigration();
