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

    const { data: familyData } = await supabase
      .from('families')
      .select('currency')
      .eq('id', session.member.family_id)
      .single()

    return NextResponse.json({
      success: true,
      currency: familyData?.currency || 'KWD',
    })
  } catch (err) {
    console.error('[GHRS FAMILY CURRENCY] Unexpected error:', err)
    return NextResponse.json({ success: false, error: 'حدث خطأ غير متوقع' }, { status: 500 })
  }
}