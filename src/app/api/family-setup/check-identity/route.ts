import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ success: false, hasFamily: false }, { status: 401 })
    }

    const admin = createServiceRoleClient()
    const { data: identity } = await admin
      .from('auth_identities')
      .select('member_id')
      .eq('auth_user_id', user.id)
      .single()

    return NextResponse.json({
      success: true,
      hasFamily: !!identity,
    })
  } catch {
    return NextResponse.json({ success: false, hasFamily: false }, { status: 500 })
  }
}
