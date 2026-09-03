const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const connectionString = 'postgresql://postgres.xcbedqffmknlzjfpuwdr:uH8%2B-88pqZeUn6n@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres';

async function applyMigrations() {
  const client = new Client({ connectionString });
  try {
    await client.connect();
    console.log('Connected to Production Database');
    
    // First apply 034c to fix the CHECK constraint
    console.log('\n=== Applying Migration 034c (fix constraint) ===');
    const sql034c = fs.readFileSync(path.join(__dirname, 'supabase', 'migrations', '034c_fix_action_values.sql'), 'utf8');
    await client.query(sql034c);
    console.log('✅ Migration 034c applied');
    
    // Then apply 034
    console.log('\n=== Applying Migration 034 ===');
    const sql034 = fs.readFileSync(path.join(__dirname, 'supabase', 'migrations', '034_task_lifecycle.sql'), 'utf8');
    await client.query(sql034);
    console.log('✅ Migration 034 applied');
    
    // Verify status column
    const statusCol = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name='tasks' AND column_name='status'");
    console.log('\n✅ Status column:', statusCol.rows.length > 0 ? 'EXISTS' : 'MISSING');
    
    // Verify RPCs
    const rpcs = await client.query("SELECT proname FROM pg_proc WHERE proname IN ('complete_task_with_rewards', 'approve_task_completion', 'revoke_task_completion', 'is_task_available', 'get_available_tasks') ORDER BY proname");
    console.log('✅ RPCs:', rpcs.rows.map(r => r.proname).join(', '));
    
    // Verify CHECK constraint
    const constraint = await client.query("SELECT pg_get_constraintdef(oid) as def FROM pg_constraint WHERE conname = 'task_approval_history_action_check'");
    console.log('✅ CHECK constraint:', constraint.rows[0]?.def);
    
    console.log('\n✅ All migrations applied successfully!');
  } catch (e) {
    console.error('❌ Error:', e.message);
  } finally {
    await client.end();
  }
}
applyMigrations();
