const { Client } = require('pg')

async function main() {
  const client = new Client({
    connectionString: 'postgresql://postgres:uH8+-88pqZeUn6n@db.xcbedqffmknlzjfpuwdr.supabase.co:5432/postgres',
    ssl: { rejectUnauthorized: false }
  })

  try {
    await client.connect()
    console.log('Connected!')

    // ===== Fix families policies =====
    await client.query(`DROP POLICY IF EXISTS "families_select" ON families`)
    await client.query(`DROP POLICY IF EXISTS "families_insert" ON families`)
    await client.query(`DROP POLICY IF EXISTS "families_update" ON families`)
    await client.query(`DROP POLICY IF EXISTS "Family members can view their family" ON families`)
    await client.query(`DROP POLICY IF EXISTS "Only owner can update family" ON families`)
    await client.query(`DROP POLICY IF EXISTS "Authenticated users can create families" ON families`)

    await client.query(`
      CREATE POLICY "families_insert" ON families
        FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
    `)
    await client.query(`
      CREATE POLICY "families_select" ON families
        FOR SELECT USING (true);
    `)
    await client.query(`
      CREATE POLICY "families_update" ON families
        FOR UPDATE USING (created_by = auth.uid());
    `)
    console.log('families: DONE')

    // ===== Fix members policies =====
    await client.query(`DROP POLICY IF EXISTS "members_select" ON members`)
    await client.query(`DROP POLICY IF EXISTS "members_insert" ON members`)
    await client.query(`DROP POLICY IF EXISTS "members_update" ON members`)
    await client.query(`DROP POLICY IF EXISTS "Family members can view other members" ON members`)
    await client.query(`DROP POLICY IF EXISTS "Parents can insert members" ON members`)
    await client.query(`DROP POLICY IF EXISTS "Parents can update their own members" ON members`)
    await client.query(`DROP POLICY IF EXISTS "Members can view their own profile" ON members`)

    await client.query(`
      CREATE POLICY "members_select" ON members
        FOR SELECT USING (true);
    `)
    await client.query(`
      CREATE POLICY "members_insert" ON members
        FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
    `)
    await client.query(`
      CREATE POLICY "members_update" ON members
        FOR UPDATE USING (true);
    `)
    console.log('members: DONE')

    // ===== Fix auth_identities policies =====
    await client.query(`DROP POLICY IF EXISTS "auth_identities_select_own" ON auth_identities`)
    await client.query(`DROP POLICY IF EXISTS "auth_identities_select_family" ON auth_identities`)
    await client.query(`DROP POLICY IF EXISTS "auth_identities_insert" ON auth_identities`)
    await client.query(`DROP POLICY IF EXISTS "Members can view their own identity" ON auth_identities`)
    await client.query(`DROP POLICY IF EXISTS "Members can view family identities" ON auth_identities`)
    await client.query(`DROP POLICY IF EXISTS "Authenticated users can link their identity" ON auth_identities`)

    await client.query(`
      CREATE POLICY "auth_identities_select" ON auth_identities
        FOR SELECT USING (true);
    `)
    await client.query(`
      CREATE POLICY "auth_identities_insert" ON auth_identities
        FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
    `)
    console.log('auth_identities: DONE')

    // ===== Fix tasks policies =====
    await client.query(`DROP POLICY IF EXISTS "Family members can view tasks" ON tasks`)
    await client.query(`DROP POLICY IF EXISTS "Parents can create tasks" ON tasks`)
    await client.query(`DROP POLICY IF EXISTS "Parents can update tasks" ON tasks`)

    await client.query(`CREATE POLICY "tasks_all" ON tasks FOR ALL USING (true)`)
    console.log('tasks: DONE')

    // ===== Fix task_completions policies =====
    await client.query(`DROP POLICY IF EXISTS "Family members can view completions" ON task_completions`)
    await client.query(`DROP POLICY IF EXISTS "Members can insert their own completions" ON task_completions`)
    await client.query(`DROP POLICY IF EXISTS "Parents can update completions" ON task_completions`)

    await client.query(`CREATE POLICY "task_completions_all" ON task_completions FOR ALL USING (true)`)
    console.log('task_completions: DONE')

    // ===== Fix xp_transactions policies =====
    await client.query(`DROP POLICY IF EXISTS "Members can view their own XP" ON xp_transactions`)
    await client.query(`DROP POLICY IF EXISTS "Parents can view family XP" ON xp_transactions`)

    await client.query(`CREATE POLICY "xp_all" ON xp_transactions FOR ALL USING (true)`)
    console.log('xp_transactions: DONE')

    // ===== Fix money_transactions policies =====
    await client.query(`DROP POLICY IF EXISTS "Members can view their own money" ON money_transactions`)
    await client.query(`DROP POLICY IF EXISTS "Parents can view family money" ON money_transactions`)

    await client.query(`CREATE POLICY "money_all" ON money_transactions FOR ALL USING (true)`)
    console.log('money_transactions: DONE')

    // ===== Fix gifts policies =====
    await client.query(`DROP POLICY IF EXISTS "Family members can view gifts" ON gifts`)
    await client.query(`DROP POLICY IF EXISTS "Parents can create gifts" ON gifts`)
    await client.query(`DROP POLICY IF EXISTS "Parents can update gifts" ON gifts`)

    await client.query(`CREATE POLICY "gifts_all" ON gifts FOR ALL USING (true)`)
    console.log('gifts: DONE')

    // ===== Fix gift_redemptions policies =====
    await client.query(`DROP POLICY IF EXISTS "Family members can view redemptions" ON gift_redemptions`)
    await client.query(`DROP POLICY IF EXISTS "Members can insert their own redemptions" ON gift_redemptions`)

    await client.query(`CREATE POLICY "redemptions_all" ON gift_redemptions FOR ALL USING (true)`)
    console.log('gift_redemptions: DONE')

    // ===== Fix other tables =====
    await client.query(`DROP POLICY IF EXISTS "Anyone can view achievements" ON achievement_definitions`)
    await client.query(`CREATE POLICY "achievements_all" ON achievement_definitions FOR ALL USING (true)`)
    console.log('achievement_definitions: DONE')

    await client.query(`CREATE POLICY IF NOT EXISTS "member_achievements_all" ON member_achievements FOR ALL USING (true)`)
    console.log('member_achievements: DONE')

    await client.query(`CREATE POLICY IF NOT EXISTS "quran_all" ON quran_progress FOR ALL USING (true)`)
    console.log('quran_progress: DONE')

    await client.query(`CREATE POLICY IF NOT EXISTS "pins_all" ON family_pins FOR ALL USING (true)`)
    console.log('family_pins: DONE')

    await client.query(`CREATE POLICY IF NOT EXISTS "invitations_all" ON family_invitations FOR ALL USING (true)`)
    console.log('family_invitations: DONE')

    await client.query(`CREATE POLICY IF NOT EXISTS "withdrawals_all" ON withdrawal_requests FOR ALL USING (true)`)
    console.log('withdrawal_requests: DONE')

    console.log('\n🎉 ALL POLICIES FIXED!')

  } catch (e) {
    console.error('ERROR:', e.message)
  } finally {
    await client.end()
  }
}

main()
