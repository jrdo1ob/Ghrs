const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const connectionString = process.env.SUPABASE_DB_URL;
if (!connectionString) {
  console.error('Error: SUPABASE_DB_URL environment variable is required.');
  process.exit(1);
}

async function runMigration() {
  const client = new Client({ connectionString });
  try {
    await client.connect();
    console.log('Connected');
    const sql = fs.readFileSync(path.join(__dirname, 'supabase', 'migrations', '037_enforce_family_isolation.sql'), 'utf8');
    await client.query(sql);
    console.log('Migration 037 applied');
    console.log('Done!');
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await client.end();
  }
}
runMigration();