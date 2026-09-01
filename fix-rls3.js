const { Client } = require('pg')

async function main() {
  const client = new Client({
    connectionString: 'postgresql://postgres:uH8+-88pqZeUn6n@db.xcbedqffmknlzjfpuwdr.supabase.co:5432/postgres',
    ssl: { rejectUnauthorized: false }
  })

  try {
    await client.connect()

    // member_achievements
    await client.query(`DROP POLICY IF EXISTS "member_achievements_all" ON member_achievements`)
    await client.query(`DROP POLICY IF EXISTS "Members can view their own achievements" ON member_achievements`)
    await client.query(`DROP POLICY IF EXISTS "Parents can view family achievements" ON member_achievements`)
    await client.query(`CREATE POLICY "member_achievements_all" ON member_achievements FOR ALL USING (true)`)
    console.log('member_achievements: DONE')

    // quran_progress
    await client.query(`DROP POLICY IF EXISTS "quran_all" ON quran_progress`)
    await client.query(`DROP POLICY IF EXISTS "Members can view their own progress" ON quran_progress`)
    await client.query(`DROP POLICY IF EXISTS "Parents can view family progress" ON quran_progress`)
    await client.query(`DROP POLICY IF EXISTS "Members can insert their own progress" ON quran_progress`)
    await client.query(`CREATE POLICY "quran_all" ON quran_progress FOR ALL USING (true)`)
    console.log('quran_progress: DONE')

    // family_pins
    await client.query(`DROP POLICY IF EXISTS "pins_all" ON family_pins`)
    await client.query(`DROP POLICY IF EXISTS "Members can view their own PIN" ON family_pins`)
    await client.query(`CREATE POLICY "pins_all" ON family_pins FOR ALL USING (true)`)
    console.log('family_pins: DONE')

    // family_invitations
    await client.query(`DROP POLICY IF EXISTS "invitations_all" ON family_invitations`)
    await client.query(`CREATE POLICY "invitations_all" ON family_invitations FOR ALL USING (true)`)
    console.log('family_invitations: DONE')

    // withdrawal_requests
    await client.query(`DROP POLICY IF EXISTS "withdrawals_all" ON withdrawal_requests`)
    await client.query(`CREATE POLICY "withdrawals_all" ON withdrawal_requests FOR ALL USING (true)`)
    console.log('withdrawal_requests: DONE')

    console.log('\n🎉 ALL DONE!')

  } catch (e) {
    console.error('ERROR:', e.message)
  } finally {
    await client.end()
  }
}

main()
