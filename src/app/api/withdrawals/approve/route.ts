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

    const { withdrawal_id, action, reason } = await request.json()
    if (!withdrawal_id || !action) {
      return NextResponse.json({ success: false, error: 'بيانات غير مكتملة' }, { status: 400 })
    }

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ success: false, error: 'إجراء غير صالح' }, { status: 400 })
    }

    const supabase = createServiceRoleClient()

    if (action === 'approve') {
      // Atomic approval via RPC: locks row, checks balance, deducts, updates status
      const { data, error } = await supabase.rpc('approve_withdrawal', {
        p_withdrawal_id: withdrawal_id,
        p_approver_member_id: member.member_id,
      })

      if (error) {
        console.error('[GHRS WITHDRAWAL APPROVE] RPC error:', error.message)
        return NextResponse.json({ success: false, error: 'حدث خطأ أثناء المعالجة' }, { status: 500 })
      }

      const result = Array.isArray(data) ? data[0] : data
      if (!result || !result.success) {
        return NextResponse.json(
          { success: false, error: result?.message || 'فشل في المعالجة' },
          { status: 400 }
        )
      }

      return NextResponse.json({ success: true, message: result.message })
    } else {
      // Reject: update withdrawal status
      const { error: updateError } = await supabase
        .from('withdrawal_requests')
        .update({
          status: 'rejected',
          processed_by: member.member_id,
          processed_at: new Date().toISOString(),
        })
        .eq('id', withdrawal_id)
        .eq('status', 'pending')

      if (updateError) {
        return NextResponse.json({ success: false, error: 'حدث خطأ' }, { status: 500 })
      }

      return NextResponse.json({ success: true, message: 'تم رفض طلب السحب' })
    }
  } catch (err) {
    console.error('[GHRS WITHDRAWAL APPROVE] Unexpected error:', err)
    return NextResponse.json({ success: false, error: 'حدث خطأ غير متوقع' }, { status: 500 })
  }
}
