const { Client } = require('pg');

const connectionString = 'postgresql://postgres.xcbedqffmknlzjfpuwdr:uH8%2B-88pqZeUn6n@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres';

async function testPresetRPC() {
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    console.log('✅ Connected\n');
    
    // 1. Check if add_preset_task exists
    console.log('🔍 Checking add_preset_task RPC...');
    const rpc = await client.query(`
      SELECT p.proname, pg_get_function_arguments(p.oid) as args
      FROM pg_proc p WHERE p.proname = 'add_preset_task'
    `);
    
    if (rpc.rows.length > 0) {
      console.log('  ✅ Found:', rpc.rows[0].args);
    } else {
      console.log('  ❌ NOT FOUND - Creating...');
      await client.query(`
        CREATE OR REPLACE FUNCTION add_preset_task(
          p_preset_id UUID,
          p_family_id UUID,
          p_created_by UUID DEFAULT NULL,
          p_custom_xp INTEGER DEFAULT NULL,
          p_custom_money NUMERIC DEFAULT NULL
        )
        RETURNS UUID AS $$
        DECLARE
          v_preset RECORD;
          v_new_task_id UUID;
          v_created_by UUID;
        BEGIN
          SELECT * INTO v_preset FROM preset_tasks WHERE id = p_preset_id;
          IF v_preset IS NULL THEN RAISE EXCEPTION 'Preset task not found'; END IF;
          
          v_created_by := p_created_by;
          IF v_created_by IS NULL THEN
            SELECT id INTO v_created_by FROM members 
            WHERE family_id = p_family_id AND role IN ('owner', 'parent')
            ORDER BY created_at ASC LIMIT 1;
          END IF;
          
          IF v_created_by IS NULL THEN
            RAISE EXCEPTION 'No owner or parent found for family';
          END IF;
          
          INSERT INTO tasks (
            family_id, title, description, xp_reward, money_reward, 
            requires_approval, frequency, is_active, created_by
          ) VALUES (
            p_family_id, v_preset.title, v_preset.description,
            COALESCE(p_custom_xp, v_preset.xp_reward),
            COALESCE(p_custom_money, v_preset.money_reward),
            v_preset.requires_approval, v_preset.frequency, TRUE, v_created_by
          ) RETURNING id INTO v_new_task_id;
          
          RETURN v_new_task_id;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
      `);
      console.log('  ✅ Created');
    }
    
    // 2. Test the RPC
    console.log('\n🧪 Testing add_preset_task...');
    const test = await client.query(`
      SELECT add_preset_task(
        (SELECT id FROM preset_tasks LIMIT 1),
        (SELECT id FROM families LIMIT 1),
        (SELECT id FROM members WHERE role IN ('owner', 'parent') LIMIT 1)
      )
    `);
    console.log('  Result:', test.rows[0].add_preset_task ? '✅ SUCCESS' : '❌ FAILED');
    
    // 3. Check preset_tasks
    console.log('\n📋 Preset tasks available:');
    const presets = await client.query('SELECT id, title, category FROM preset_tasks ORDER BY sort_order');
    presets.rows.forEach(p => console.log(`  ${p.category}: ${p.title}`));
    
    // 4. Check tasks in first family
    console.log('\n📋 Tasks in first family:');
    const tasks = await client.query(`
      SELECT t.title, t.xp_reward, m.name as created_by_name
      FROM tasks t
      LEFT JOIN members m ON t.created_by = m.id
      WHERE t.family_id = (SELECT id FROM families LIMIT 1)
      ORDER BY t.created_at DESC LIMIT 5
    `);
    tasks.rows.forEach(t => console.log(`  ${t.title} (${t.xp_reward} XP) by ${t.created_by_name || 'N/A'}`));
    
    console.log('\n🎉 Done!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

testPresetRPC();
