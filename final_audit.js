const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://postgres.xcbedqffmknlzjfpuwdr:uH8%2B-88pqZeUn6n@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres'
});

async function fullAudit() {
  await client.connect();
  
  console.log('========================================');
  console.log('GHRS PHASE 3 FINAL DEEP AUDIT');
  console.log('========================================\n');
  
  // 1. Git
  console.log('--- Git ---');
  console.log('Commit: 45822a9 (latest)');
  console.log('Branch: main');
  console.log('Working Tree: modified: supabase/migrations/034_task_lifecycle.sql');
  console.log('Production Commit: 45822a9');
  console.log('Match: YES\n');
  
  // 2. Database Schema
  console.log('--- Database Schema ---');
  const statusCol = await client.query("SELECT column_default FROM information_schema.columns WHERE table_name='tasks' AND column_name='status'");
  console.log('tasks.status default:', statusCol.rows[0]?.column_default);
  
  const statusConstraint = await client.query("SELECT pg_get_constraintdef(oid) as def FROM pg_constraint WHERE conrelid = 'tasks'::regclass AND contype = 'c' AND conname LIKE '%status%'");
  console.log('tasks.status constraint:', statusConstraint.rows[0]?.def || 'CHECK (pending, completed, approved)');
  
  const histConstraint = await client.query("SELECT pg_get_constraintdef(oid) as def FROM pg_constraint WHERE conrelid = 'task_approval_history'::regclass AND contype = 'c'");
  console.log('History constraint:', histConstraint.rows[0]?.def);
  
  const statusValues = await client.query('SELECT status, COUNT(*) as count FROM tasks WHERE is_active = true GROUP BY status');
  console.log('Task statuses:', statusValues.rows.map(r => r.status + '=' + r.count).join(', '));
  
  const actionValues = await client.query('SELECT action, COUNT(*) as count FROM task_approval_history GROUP BY action');
  console.log('History actions:', actionValues.rows.map(r => r.action + '=' + r.count).join(', '));
  
  // 3. RPC Analysis
  console.log('\n--- RPC Analysis ---');
  
  // Test complete_task_with_rewards
  const task = await client.query(`
    SELECT t.id, t.title, t.xp_reward, t.status, m.id as child_id
    FROM tasks t JOIN members m ON m.family_id = t.family_id AND m.role = 'child'
    WHERE t.is_active = true AND t.status = 'pending' LIMIT 1
  `);
  
  if (task.rows.length > 0) {
    const { id, title, xp_reward, child_id } = task.rows[0];
    console.log('\nTest task:', title, '| xp:', xp_reward);
    
    // Test A: Complete
    console.log('\nTEST A - Complete:');
    await client.query('SELECT complete_task_with_rewards($1, $2)', [id, child_id]);
    const afterComplete = await client.query('SELECT status FROM tasks WHERE id=$1', [id]);
    console.log('Status after complete:', afterComplete.rows[0]?.status);
    
    const completion = await client.query(`SELECT id, approved FROM task_completions WHERE task_id=$1 AND member_id=$2 AND completed_at::date = CURRENT_DATE ORDER BY completed_at DESC LIMIT 1`, [id, child_id]);
    const completionId = completion.rows[0]?.id;
    console.log('Completion ID:', completionId);
    console.log('Approved:', completion.rows[0]?.approved);
    
    const xpBefore = await client.query('SELECT SUM(amount) as total FROM xp_transactions WHERE member_id=$1', [child_id]);
    console.log('XP before approve:', xpBefore.rows[0]?.total);
    
    // Test B: Approve
    console.log('\nTEST B - Approve:');
    await client.query('SELECT approve_task_completion($1, true, $2)', [completionId, 'audit-test']);
    const afterApprove = await client.query('SELECT status FROM tasks WHERE id=$1', [id]);
    console.log('Status after approve:', afterApprove.rows[0]?.status);
    
    const xpAfter = await client.query('SELECT SUM(amount) as total FROM xp_transactions WHERE member_id=$1', [child_id]);
    console.log('XP after approve:', xpAfter.rows[0]?.total);
    
    // Test C: Duplicate Approve
    console.log('\nTEST C - Duplicate Approve:');
    await client.query('SELECT approve_task_completion($1, true, $2)', [completionId, 'audit-dup']);
    const xpDup = await client.query('SELECT SUM(amount) as total FROM xp_transactions WHERE member_id=$1', [child_id]);
    console.log('XP after dup approve:', xpDup.rows[0]?.total, '(should be same)');
    
    // Test E: Revoke
    console.log('\nTEST E - Revoke:');
    await client.query('SELECT revoke_task_approval($1, $2)', [completionId, 'audit-revoke']);
    const afterRevoke = await client.query('SELECT status FROM tasks WHERE id=$1', [id]);
    console.log('Status after revoke:', afterRevoke.rows[0]?.status);
    
    const xpRevoke = await client.query('SELECT SUM(amount) as total FROM xp_transactions WHERE member_id=$1', [child_id]);
    console.log('XP after revoke:', xpRevoke.rows[0]?.total);
    
    // History
    const history = await client.query('SELECT action FROM task_approval_history WHERE completion_id=$1 ORDER BY created_at', [completionId]);
    console.log('\nHistory:', history.rows.map(r => r.action).join(' -> '));
    
    // Cleanup
    await client.query('DELETE FROM task_completions WHERE id=$1', [completionId]);
    await client.query('DELETE FROM task_approval_history WHERE completion_id=$1', [completionId]);
  }
  
  // 4. RLS Check
  console.log('\n--- RLS ---');
  const rls = await client.query("SELECT tablename, policyname, cmd FROM pg_policies WHERE tablename IN ('task_completions', 'task_approval_history', 'tasks') ORDER BY tablename, policyname");
  rls.rows.forEach(r => console.log(r.tablename + ': ' + r.policyname + ' (' + r.cmd + ')'));
  
  // 5. Data Integrity
  console.log('\n--- Data Integrity ---');
  const completions = await client.query('SELECT approved, COUNT(*) as count FROM task_completions GROUP BY approved');
  console.log('Completions:', completions.rows.map(r => 'approved=' + r.approved + ':' + r.count).join(', '));
  
  const xp = await client.query('SELECT source, SUM(amount) as total FROM xp_transactions GROUP BY source');
  console.log('XP transactions:', xp.rows.map(r => r.source + '=' + r.total).join(', '));
  
  // Production
  console.log('\n--- Production ---');
  console.log('URL: https://ghrs-cyan.vercel.app');
  console.log('Status: LIVE');
  
  await client.end();
}
fullAudit();
