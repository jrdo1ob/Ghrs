const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const connectionString = 'postgresql://postgres.xcbedqffmknlzjfpuwdr:uH8%2B-88pqZeUn6n@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres';

async function runSecurityFix() {
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    console.log('✅ Connected\n');
    
    // Read migration file
    const migrationPath = path.join(__dirname, 'supabase', 'migrations', '017_security_hardening.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('🔒 Running Security Hardening Migration...');
    await client.query(migrationSQL);
    console.log('✅ Migration completed');
    
    // Verify
    console.log('\n🔍 Verifying security fixes...');
    
    // Check RLS policies
    const policies = await client.query(`
      SELECT tablename, policyname, permissive, roles, cmd, qual, with_check
      FROM pg_policies
      WHERE schemaname = 'public'
      ORDER BY tablename, policyname
    `);
    
    console.log('\n📋 RLS Policies:');
    const tables = {};
    for (const p of policies.rows) {
      if (!tables[p.tablename]) tables[p.tablename] = [];
      tables[p.tablename].push(`${p.cmd}: ${p.policyname}`);
    }
    for (const [table, cmds] of Object.entries(tables)) {
      console.log(`  ${table}: ${cmds.join(', ')}`);
    }
    
    // Check triggers
    const triggers = await client.query(`
      SELECT trigger_name, event_manipulation, event_object_table
      FROM information_schema.triggers
      WHERE trigger_schema = 'public'
      AND trigger_name LIKE 'trg_prevent%'
    `);
    
    console.log('\n🛡️ Ledger Protection Triggers:');
    for (const t of triggers.rows) {
      console.log(`  ${t.event_object_table}: ${t.event_manipulation} blocked`);
    }
    
    // Check functions
    const functions = await client.query(`
      SELECT p.proname
      FROM pg_proc p
      WHERE p.proname IN ('create_user_session', 'validate_session', 'get_current_member_id')
    `);
    
    console.log('\n🔐 Security Functions:');
    for (const f of functions.rows) {
      console.log(`  ✅ ${f.proname}`);
    }
    
    console.log('\n🎉 Security hardening complete!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Details:', error.detail);
  } finally {
    await client.end();
  }
}

runSecurityFix();
