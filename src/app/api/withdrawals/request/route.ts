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

    // Only children can request withdrawals
    if (member.member_role !== 'child') {
      return NextResponse.json({ success: false, error: 'هذه العملية مخصصة للأطفال فقط' }, { status: 403 })
    }

    const { amount } = await request.json()
    if (!amount || amount <= 0) {
      return NextResponse.json({ success: false, error: 'المبلغ غير صالح' }, { status: 400 })
    }

    const supabase = createServiceRoleClient()

    // Check child's money balance
    const { data: moneyData } = await supabase
      .from('money_transactions')
      .select('amount, type')
      .eq('member_id', member.member_id)
      .eq('status', 'approved')

    const balance = (moneyData || []).reduce((sum: number, t: any) => sum + (t.type === 'earned' ? t.amount : -t.amount), 0)

    if (balance < amount) {
      return NextResponse.json({ success: false, error: 'الرصيد غير كافي' }, { status: 400 })
    }

    // Check for existing pending request
    const { data: existing } = await supabase
      .from('withdrawal_requests')
      .select('id')
      .eq('member_id', member.member_id)
      .eq('status', 'pending')
      .limit(1)

    if (existing && existing.length > 0) {
      return NextResponse.json({ success: false, error: 'يوجد طلب سحب معلق بالفعل' }, { status: 400 })
    }

    // Create withdrawal request
    const { data, error } = await supabase
      .from('withdrawal_requests')
      .insert({
        member_id: member.member_id,
        amount: amount,
        status: 'pending',
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ success: false, error: 'حدث خطأ' }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'تم إرسال طلب السحب بنجاح' })
  } catch (err) {
    console.error('[GHRS WITHDRAWAL] Unexpected error:', err)
    return NextResponse.json({ success: false, error: 'حدث خطأ غير متوقع' }, { status: 500 })
  }
}
