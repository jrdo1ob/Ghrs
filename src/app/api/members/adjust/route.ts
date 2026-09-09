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

    const { child_id, type, currency_type, amount, reason } = await request.json()
    if (!child_id || !type || !currency_type || !amount || !reason) {
      return NextResponse.json({ success: false, error: 'بيانات غير مكتملة' }, { status: 400 })
    }

    const supabase = createServiceRoleClient()

    // Verify child belongs to session family
    const { data: child } = await supabase
      .from('members')
      .select('family_id, role')
      .eq('id', child_id)
      .single()

    if (!child || child.role !== 'child') {
      return NextResponse.json({ success: false, error: 'الطفل غير موجود' }, { status: 404 })
    }

    if (child.family_id !== member.family_id) {
      return NextResponse.json({ success: false, error: 'الطفل لا ينتمي لعائلتك' }, { status: 403 })
    }

    const { data, error } = await supabase.rpc('apply_manual_adjustment', {
      p_child_id: child_id,
      p_type: type,
      p_currency_type: currency_type,
      p_amount: amount,
      p_reason: reason,
      p_caller_member_id: member.member_id,
    })

    const result = Array.isArray(data) ? data[0] : data

    if (error || !result || !result.success) {
      const message = (result && result.message) || error?.message || 'حدث خطأ'
      return NextResponse.json({ success: false, error: message }, { status: 500 })
    }

    return NextResponse.json({ success: true, ...result })
  } catch (err) {
    console.error('[GHRS ADJUST] Unexpected error:', err)
    return NextResponse.json({ success: false, error: 'حدث خطأ غير متوقع' }, { status: 500 })
  }
}
