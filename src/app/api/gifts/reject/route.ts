import { NextResponse, type NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { validateSession, requireParentRole } from '@/lib/auth/server-session'

export async function POST(request: NextRequest) {
  try {
    const session = await validateSession(request)
    if (!session.success || !session.member) {
      return NextResponse.json({ success: false, error: session.error }, { status: session.status })
    }

    const member = session.member

    const roleCheck = requireParentRole(member)
    if (!roleCheck.ok) {
      return NextResponse.json({ success: false, error: roleCheck.error }, { status: roleCheck.status })
    }

    const { redemption_id, reason } = await request.json()
    if (!redemption_id) {
      return NextResponse.json({ success: false, error: 'معرف طلب الهدية مطلوب' }, { status: 400 })
    }

    const supabase = createServiceRoleClient()

    // Call reject_gift_redemption RPC
    const { data, error } = await supabase.rpc('reject_gift_redemption', {
      p_redemption_id: redemption_id,
      p_reason: reason || null,
      p_caller_member_id: member.member_id,
    })

    const result = Array.isArray(data) ? data[0] : data

    if (error || !result || !result.success) {
      const message = (result && result.message) || error?.message || 'حدث خطأ'
      return NextResponse.json({ success: false, error: message }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: result.message })
  } catch (err) {
    console.error('[GHRS REJECT GIFT] Unexpected error:', err)
    return NextResponse.json({ success: false, error: 'حدث خطأ غير متوقع' }, { status: 500 })
  }
}
