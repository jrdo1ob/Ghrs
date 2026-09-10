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

    // Get withdrawal request
    const { data: withdrawal, error: wError } = await supabase
      .from('withdrawal_requests')
      .select('*')
      .eq('id', withdrawal_id)
      .single()

    if (wError || !withdrawal) {
      return NextResponse.json({ success: false, error: 'طلب السحب غير موجود' }, { status: 404 })
    }

    // Verify family ownership
    const { data: childData } = await supabase
      .from('members')
      .select('family_id')
      .eq('id', withdrawal.member_id)
      .single()

    if (!childData || childData.family_id !== member.family_id) {
      return NextResponse.json({ success: false, error: 'طلب السحب لا ينتمي لعائلتك' }, { status: 403 })
    }

    // Check if already processed
    if (withdrawal.status !== 'pending') {
      return NextResponse.json({ success: false, error: 'تم معالجة هذا الطلب بالفعل' }, { status: 400 })
    }

    if (action === 'approve') {
      // Check balance again
      const { data: moneyData } = await supabase
        .from('money_transactions')
        .select('amount, type')
        .eq('member_id', withdrawal.member_id)
        .eq('status', 'approved')

      const balance = (moneyData || []).reduce((sum: number, t: any) => sum + (t.type === 'earned' ? t.amount : -t.amount), 0)

      if (balance < withdrawal.amount) {
        return NextResponse.json({ success: false, error: 'الرصيد غير كافي للموافقة' }, { status: 400 })
      }

      // Deduct money
      const { error: deductError } = await supabase
        .from('money_transactions')
        .insert({
          member_id: withdrawal.member_id,
          amount: withdrawal.amount,
          type: 'withdrawn',
          source: 'withdrawal',
          source_id: withdrawal.id,
          status: 'approved',
          description: 'سحب من الرصيد',
        })

      if (deductError) {
        return NextResponse.json({ success: false, error: 'حدث خطأ أثناء الخصم' }, { status: 500 })
      }

      // Mark as approved/paid
      const { error: updateError } = await supabase
        .from('withdrawal_requests')
        .update({
          status: 'paid',
          processed_by: member.member_id,
          processed_at: new Date().toISOString(),
        })
        .eq('id', withdrawal_id)

      if (updateError) {
        return NextResponse.json({ success: false, error: 'حدث خطأ' }, { status: 500 })
      }

      return NextResponse.json({ success: true, message: 'تمت الموافقة على السحب' })
    } else {
      // Reject
      const { error: updateError } = await supabase
        .from('withdrawal_requests')
        .update({
          status: 'rejected',
          processed_by: member.member_id,
          processed_at: new Date().toISOString(),
        })
        .eq('id', withdrawal_id)

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
