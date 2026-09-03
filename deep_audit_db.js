const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://postgres.xcbedqffmknlzjfpuwdr:uH8%2B-88pqZeUn6n@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres'
});

async function check() {
  await client.connect();
  
  // Check tasks table columns
  const tasksCols = await client.query("SELECT column_name, data_type, column_default, is_nullable FROM information_schema.columns WHERE table_schema='public' AND table_name='tasks' AND column_name IN ('status', 'task_type', 'quran_action_type') ORDER BY ordinal_position");
  console.log('=== tasks columns ===');
  tasksCols.rows.forEach(r => console.log(r.column_name + ': ' + r.data_type + ' | default=' + r.column_default + ' | nullable=' + r.is_nullable));
  
  // Check tasks status CHECK constraint
  const statusConstraint = await client.query("SELECT pg_get_constraintdef(oid) as def FROM pg_constraint WHERE conrelid = 'tasks'::regclass AND contype = 'c' AND conname LIKE '%status%'");
  console.log('\n=== tasks.status constraint ===');
  console.log(statusConstraint.rows[0]?.def || 'NO CONSTRAINT');
  
  // Check task_approval_history columns
  const histCols = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='public' AND table_name='task_approval_history' ORDER BY ordinal_position");
  console.log('\n=== task_approval_history columns ===');
  histCols.rows.forEach(r => console.log(r.column_name + ': ' + r.data_type));
  
  // Check task_approval_history CHECK constraint
  const histConstraint = await client.query("SELECT pg_get_constraintdef(oid) as def FROM pg_constraint WHERE conrelid = 'task_approval_history'::regclass AND contype = 'c'");
  console.log('\n=== task_approval_history constraints ===');
  histConstraint.rows.forEach(r => console.log(r.def));
  
  // Check actual status values in tasks
  const statusValues = await client.query('SELECT DISTINCT status, COUNT(*) as count FROM tasks GROUP BY status ORDER BY status');
  console.log('\n=== tasks status values ===');
  statusValues.rows.forEach(r => console.log('status=' + r.status + ': ' + r.count));
  
  // Check actual action values in task_approval_history
  const actionValues = await client.query('SELECT DISTINCT action, COUNT(*) as count FROM task_approval_history GROUP BY action ORDER BY action');
  console.log('\n=== task_approval_history action values ===');
  actionValues.rows.forEach(r => console.log('action=' + r.action + ': ' + r.count));
  
  // Check foreign keys
  const fkeys = await client.query("SELECT conname, pg_get_constraintdef(oid) as def FROM pg_constraint WHERE conrelid = 'task_approval_history'::regclass AND contype = 'f'");
  console.log('\n=== task_approval_history foreign keys ===');
  fkeys.rows.forEach(r => console.log(r.conname + ': ' + r.def));
  
  // Check RPC definitions
  const rpcs = await client.query("SELECT proname, pg_get_functiondef(oid) as def FROM pg_proc WHERE proname IN ('complete_task_with_rewards', 'approve_task_completion', 'revoke_task_approval', 'is_task_available', 'get_available_tasks') ORDER BY proname");
  console.log('\n=== RPC Definitions ===');
  rpcs.rows.forEach(r => {
    console.log('\n--- ' + r.proname + ' ---');
    // Print first 500 chars of definition
    console.log(r.def.substring(0, 500) + '...');
  });
  
  // Check RLS policies for task_approval_history
  const rls = await client.query("SELECT policyname, cmd, qual FROM pg_policies WHERE tablename = 'task_approval_history'");
  console.log('\n=== task_approval_history RLS ===');
  rls.rows.forEach(r => console.log(r.policyname + ' (' + r.cmd + '): ' + r.qual));
  
  await client.end();
}
check();
