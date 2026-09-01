const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const connectionString = 'postgresql://postgres.xcbedqffmknlzjfpuwdr:uH8%2B-88pqZeUn6n@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres';

async function runMigration() {
  const client = new Client({ connectionString });
  try {
    await client.connect();
    console.log('✅ Connected');
    const sql = fs.readFileSync(path.join(__dirname, 'supabase', 'migrations', '019_quran_memorization_engine.sql'), 'utf8');
    await client.query(sql);
    console.log('✅ Migration 019 applied');
    const cols = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_name='tasks' AND column_name IN ('task_type','quran_action_type','surah_number','from_ayah','to_ayah','custom_title','custom_content_text') ORDER BY column_name`);
    console.log('📋 Quran columns:', cols.rows.map(r => r.column_name).join(', '));
    const surahs = await client.query('SELECT COUNT(*) as cnt FROM surah_names');
    console.log('📖 Surah names:', surahs.rows[0].cnt);
    console.log('🎉 Done!');
  } catch (e) {
    console.error('❌', e.message);
    if (e.detail) console.error('Detail:', e.detail);
  } finally {
    await client.end();
  }
}
runMigration();
