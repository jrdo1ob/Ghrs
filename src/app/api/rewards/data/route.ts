import { NextResponse, type NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { validateRequestAuth, requireParentRole } from '@/lib/auth/server-session'

export async function POST(request: NextRequest) {
  try {
    const session = await validateRequestAuth(request)
    if (!session.success || !session.member) {
      return NextResponse.json({ success: false, error: session.error }, { status: session.status })
    }

    const roleCheck = requireParentRole(session.member)
    if (!roleCheck.ok) {
      return NextResponse.json({ success: false, error: roleCheck.error }, { status: roleCheck.status })
    }

    const supabase = createServiceRoleClient()

    const [giftsResult, currencyResult] = await Promise.all([
      supabase
        .from('gifts')
        .select('*')
        .eq('family_id', session.member.family_id)
        .order('created_at', { ascending: false }),
      supabase.from('families').select('currency').eq('id', session.member.family_id).single(),
    ])

    return NextResponse.json({
      success: true,
      member: {
        member_id: session.member.member_id,
        member_name: session.member.member_name,
        member_role: session.member.member_role,
        family_id: session.member.family_id,
      },
      currency: currencyResult.data?.currency || 'KWD',
      gifts: giftsResult.data || [],
    })
  } catch (err) {
    console.error('[GHRS REWARDS DATA] Unexpected error:', err)
    return NextResponse.json({ success: false, error: 'حدث خطأ غير متوقع' }, { status: 500 })
  }
}