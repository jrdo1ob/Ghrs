import { NextResponse, type NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { validateRequestAuth } from '@/lib/auth/server-session'

export async function POST(request: NextRequest) {
  try {
    const session = await validateRequestAuth(request)
    if (!session.success || !session.member) {
      return NextResponse.json({ success: false, error: session.error }, { status: session.status })
    }

    const supabase = createServiceRoleClient()
    const { member_id: memberId, family_id: familyId } = session.member

    const [memberResult, familyResult] = await Promise.all([
      supabase.from('members').select('id, name, role').eq('id', memberId).single(),
      supabase.from('families').select('id, name, code, currency').eq('id', familyId).single(),
    ])

    return NextResponse.json({
      success: true,
      member: memberResult.data,
      family: familyResult.data,
    })
  } catch (err) {
    console.error('[GHRS SETTINGS DATA] Unexpected error:', err)
    return NextResponse.json({ success: false, error: 'حدث خطأ غير متوقع' }, { status: 500 })
  }
}