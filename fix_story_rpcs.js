const { Client } = require('pg');

const connectionString = 'postgresql://postgres.xcbedqffmknlzjfpuwdr:uH8%2B-88pqZeUn6n@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres';

async function fixRPCs() {
  const client = new Client({ connectionString });
  try {
    await client.connect();
    console.log('Connected');

    // Fix create_story - add frequency = 'once' for reading tasks
    await client.query(`
      CREATE OR REPLACE FUNCTION create_story(
        p_family_id UUID,
        p_title TEXT,
        p_content TEXT,
        p_moral_value TEXT DEFAULT NULL,
        p_reward_xp INTEGER DEFAULT 5,
        p_assigned_to UUID DEFAULT NULL
      )
      RETURNS UUID AS $$
      DECLARE
        v_story_id UUID;
        v_caller RECORD;
      BEGIN
        SELECT id, role, family_id INTO v_caller FROM members WHERE id = get_current_member_id();
        IF v_caller IS NULL OR v_caller.family_id != p_family_id THEN
          RAISE EXCEPTION 'Access denied';
        END IF;
        IF v_caller.role NOT IN ('owner', 'parent') THEN
          RAISE EXCEPTION 'Only parents can create stories';
        END IF;

        INSERT INTO stories (family_id, title, content, moral_value, reward_xp, assigned_to, created_by)
        VALUES (p_family_id, p_title, p_content, p_moral_value, p_reward_xp, p_assigned_to, v_caller.id)
        RETURNING id INTO v_story_id;

        INSERT INTO tasks (family_id, title, description, xp_reward, frequency, assigned_to, requires_approval, is_active, created_by, story_content)
        VALUES (p_family_id, 'اقرأ: ' || p_title, 'قصة تربوية - ' || COALESCE(p_moral_value, ''), p_reward_xp, 'once',
                CASE WHEN p_assigned_to IS NOT NULL THEN ARRAY[p_assigned_to] ELSE NULL END,
                TRUE, TRUE, v_caller.id, p_content);

        RETURN v_story_id;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `);
    console.log('Fixed create_story');

    // Fix add_preset_story - add frequency = 'once' for reading tasks
    await client.query(`
      CREATE OR REPLACE FUNCTION add_preset_story(
        p_preset_id UUID,
        p_family_id UUID,
        p_assigned_to UUID DEFAULT NULL
      )
      RETURNS UUID AS $$
      DECLARE
        v_preset RECORD;
        v_story_id UUID;
        v_caller RECORD;
      BEGIN
        SELECT * INTO v_preset FROM preset_stories WHERE id = p_preset_id;
        IF v_preset IS NULL THEN RAISE EXCEPTION 'Preset story not found'; END IF;

        SELECT id, role, family_id INTO v_caller FROM members WHERE id = get_current_member_id();
        IF v_caller IS NULL OR v_caller.family_id != p_family_id THEN
          RAISE EXCEPTION 'Access denied';
        END IF;

        INSERT INTO stories (family_id, title, content, moral_value, reward_xp, assigned_to, is_preset, created_by)
        VALUES (p_family_id, v_preset.title, v_preset.content, v_preset.moral_value, 5, p_assigned_to, TRUE, v_caller.id)
        RETURNING id INTO v_story_id;

        INSERT INTO tasks (family_id, title, description, xp_reward, frequency, assigned_to, requires_approval, is_active, created_by, story_content)
        VALUES (p_family_id, 'اقرأ: ' || v_preset.title, 'قصة تربوية - ' || v_preset.moral_value, 5, 'once',
                CASE WHEN p_assigned_to IS NOT NULL THEN ARRAY[p_assigned_to] ELSE NULL END,
                TRUE, TRUE, v_caller.id, v_preset.content);

        RETURN v_story_id;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `);
    console.log('Fixed add_preset_story');

    // Verify
    const rpcs = await client.query(`
      SELECT p.proname, pg_get_functiondef(p.oid) as def
      FROM pg_proc p
      WHERE p.proname IN ('create_story', 'add_preset_story')
    `);
    for (const r of rpcs.rows) {
      const hasOnce = r.def.includes("'once'");
      console.log(r.proname + ':', hasOnce ? 'frequency=once OK' : 'MISSING frequency');
    }

    console.log('Done!');
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await client.end();
  }
}
fixRPCs();
