import { NextResponse, type NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { validateSession } from '@/lib/auth/server-session'

export async function POST(request: NextRequest) {
  try {
    const session = await validateSession(request)
    if (!session.success || !session.member) {
      return NextResponse.json({ success: false, error: session.error }, { status: session.status })
    }

    const member = session.member

    if (member.member_role !== 'child') {
      return NextResponse.json({ success: false, error: 'هذه العملية مخصصة للأطفال فقط' }, { status: 403 })
    }

    const { gift_id } = await request.json()
    if (!gift_id) {
      return NextResponse.json({ success: false, error: 'معرف الهدية مطلوب' }, { status: 400 })
    }

    const supabase = createServiceRoleClient()

    // Call request_gift_redemption RPC (creates PENDING request, does NOT deduct XP)
    const { data, error } = await supabase.rpc('request_gift_redemption', {
      p_gift_id: gift_id,
      p_member_id: member.member_id,
    })

    const result = Array.isArray(data) ? data[0] : data

    if (error || !result || !result.success) {
      const message = (result && result.message) || error?.message || 'حدث خطأ'
      return NextResponse.json({ success: false, error: message }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: result.message })
  } catch (err) {
    console.error('[GHRS REDEEM GIFT] Unexpected error:', err)
    return NextResponse.json({ success: false, error: 'حدث خطأ غير متوقع' }, { status: 500 })
  }
}
