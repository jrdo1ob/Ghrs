const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://postgres.xcbedqffmknlzjfpuwdr:uH8%2B-88pqZeUn6n@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres'
});

async function verify() {
  await client.connect();
  
  // 1. Get task details
  console.log('=== Task: تنظيف الأسنان ===');
  const task = await client.query(`
    SELECT id, title, requires_approval, xp_reward, money_reward, status, family_id
    FROM tasks WHERE title = 'تنظيف الأسنان' AND is_active = true
  `);
  
  if (task.rows.length === 0) {
    console.log('Task not found');
    await client.end();
    return;
  }
  
  const t = task.rows[0];
  console.log('task_id:', t.id);
  console.log('title:', t.title);
  console.log('requires_approval:', t.requires_approval);
  console.log('xp_reward:', t.xp_reward);
  console.log('money_reward:', t.money_reward);
  console.log('status:', t.status);
  console.log('family_id:', t.family_id);
  
  // 2. Get latest completion for 2026-09-03
  console.log('\n=== Latest Completion (2026-09-03) ===');
  const completion = await client.query(`
    SELECT id, task_id, member_id, approved, completed_at
    FROM task_completions
    WHERE task_id = $1 AND completed_at::date = '2026-09-03'
    ORDER BY completed_at DESC LIMIT 1
  `, [t.id]);
  
  if (completion.rows.length === 0) {
    console.log('No completion found for 2026-09-03');
    await client.end();
    return;
  }
  
  const c = completion.rows[0];
  console.log('completion_id:', c.id);
  console.log('task_id:', c.task_id);
  console.log('member_id:', c.member_id);
  console.log('approved:', c.approved);
  console.log('created_at:', c.created_at);
  
  // 3. Check XP transaction
  console.log('\n=== XP Transaction ===');
  const xp = await client.query(`
    SELECT id, amount, source, source_id, description
    FROM xp_transactions
    WHERE source_id = $1
  `, [c.id]);
  
  if (xp.rows.length === 0) {
    console.log('No XP transaction found');
  } else {
    xp.rows.forEach(r => {
      console.log('amount:', r.amount, 'source:', r.source, 'desc:', r.description);
    });
  }
  
  // 4. Check money transaction
  console.log('\n=== Money Transaction ===');
  const money = await client.query(`
    SELECT id, amount, type, source, source_id, description
    FROM money_transactions
    WHERE source_id = $1
  `, [c.id]);
  
  if (money.rows.length === 0) {
    console.log('No money transaction found');
  } else {
    money.rows.forEach(r => {
      console.log('amount:', r.amount, 'type:', r.type, 'desc:', r.description);
    });
  }
  
  await client.end();
}
verify();
