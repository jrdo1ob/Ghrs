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

    const { data: progressData } = await supabase
      .from('quran_progress')
      .select('*')
      .eq('member_id', session.member.member_id)

    return NextResponse.json({
      success: true,
      progress: progressData || [],
    })
  } catch (err) {
    console.error('[GHRS QURAN DATA] Unexpected error:', err)
    return NextResponse.json({ success: false, error: 'حدث خطأ غير متوقع' }, { status: 500 })
  }
}