const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://postgres.xcbedqffmknlzjfpuwdr:uH8%2B-88pqZeUn6n@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres'
});

async function findBug() {
  await client.connect();
  
  const rpc = await client.query(`
    SELECT pg_get_functiondef(p.oid) as def
    FROM pg_proc p
    WHERE p.proname = 'complete_task_with_rewards'
  `);
  
  const def = rpc.rows[0].def;
  
  // Find all occurrences of p_completion_id
  const matches = def.match(/p_completion_id/g);
  console.log(`Found ${matches ? matches.length : 0} occurrences of 'p_completion_id'`);
  
  // Find the DECLARE section
  const declareMatch = def.match(/DECLARE([\s\S]*?)BEGIN/);
  if (declareMatch) {
    console.log('\nDECLARE section:');
    console.log(declareMatch[1]);
  }
  
  // Check if p_completion_id is declared
  console.log('\np_completion_id in DECLARE:', def.includes('p_completion_id'));
  console.log('v_completion_id in DECLARE:', def.includes('v_completion_id'));
  
  // Find lines with p_completion_id
  const lines = def.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('p_completion_id')) {
      console.log(`\nLine ${i + 1}: ${lines[i].trim()}`);
    }
  }
  
  await client.end();
}
findBug();
