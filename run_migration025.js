const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const connectionString = 'postgresql://postgres.xcbedqffmknlzjfpuwdr:uH8%2B-88pqZeUn6n@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres';

async function runMigration() {
  const client = new Client({ connectionString });
  try {
    await client.connect();
    console.log('Connected');
    const sql = fs.readFileSync(path.join(__dirname, 'supabase', 'migrations', '025_rls_task_approval.sql'), 'utf8');
    await client.query(sql);
    console.log('Migration 025 applied');
    
    // Verify policies
    const policies = await client.query(`
      SELECT policyname, cmd FROM pg_policies 
      WHERE tablename IN ('tasks', 'task_completions') 
      AND schemaname = 'public'
      ORDER BY tablename, policyname
    `);
    console.log('\nPolicies:');
    for (const p of policies.rows) {
      console.log(`  ${p.tablename}: ${p.policyname} (${p.cmd})`);
    }
    
    console.log('Done!');
  } catch (e) {
    console.error('Error:', e.message);
    if (e.detail) console.error('Detail:', e.detail);
  } finally {
    await client.end();
  }
}
runMigration();
