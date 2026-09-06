const { Client } = require('pg');
const client = new Client({
  connectionString: process.env.SUPABASE_DB_URL
});

async function verify() {
  await client.connect();
  
  // Check all completion statuses
  const result = await client.query(`
    SELECT approved, COUNT(*) as count 
    FROM task_completions 
    GROUP BY approved
  `);
  console.log('=== Completion Status Distribution ===');
  for (const r of result.rows) {
    console.log(`  approved=${r.approved} (${typeof r.approved}): ${r.count} records`);
  }

  // Check what the dashboard query returns
  const dashboardQuery = await client.query(`
    SELECT COUNT(*) as count FROM task_completions WHERE approved = false
  `);
  console.log(`\nDashboard query (approved=false): ${dashboardQuery.rows[0].count} records`);

  // Check what the tasks page query returns
  const tasksQuery = await client.query(`
    SELECT COUNT(*) as count FROM task_completions WHERE approved IS NULL
  `);
  console.log(`Tasks page query (approved=null): ${tasksQuery.rows[0].count} records`);

  await client.end();
}
verify();
