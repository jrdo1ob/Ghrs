const { Client } = require('pg');
const client = new Client({
  connectionString: process.env.SUPABASE_DB_URL
});

async function check() {
  await client.connect();
  
  // Check all rows and their actions
  const r = await client.query('SELECT id, action, LENGTH(action) as len FROM task_approval_history');
  console.log('All rows:');
  r.rows.forEach(row => {
    console.log(`  ID: ${row.id}, Action: "${row.action}" (length: ${row.len})`);
    // Check for hidden characters
    const chars = [];
    for (let i = 0; i < row.action.length; i++) {
      chars.push(row.action.charCodeAt(i));
    }
    console.log(`    Char codes: ${chars.join(', ')}`);
  });
  
  await client.end();
}
check();
