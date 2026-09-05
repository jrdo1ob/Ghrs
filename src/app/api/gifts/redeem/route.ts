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

    // Verify gift belongs to the member's family
    const { data: gift } = await supabase
      .from('gifts')
      .select('family_id, is_active, title, cost_xp, cost_money')
      .eq('id', gift_id)
      .single()

    if (!gift) {
      return NextResponse.json({ success: false, error: 'الهدية غير موجودة' }, { status: 404 })
    }

    if (gift.family_id !== member.family_id) {
      return NextResponse.json({ success: false, error: 'الهدية لا تنتمي لعائلتك' }, { status: 403 })
    }

    if (!gift.is_active) {
      return NextResponse.json({ success: false, error: 'الهدية غير متوفرة' }, { status: 403 })
    }

    if (gift.cost_xp == null) {
      return NextResponse.json({ success: false, error: 'تكوين الهدية غير صالح' }, { status: 400 })
    }

    // Verify child belongs to the same family
    const { data: memberData } = await supabase
      .from('members')
      .select('family_id')
      .eq('id', member.member_id)
      .single()

    if (!memberData || memberData.family_id !== member.family_id) {
      return NextResponse.json({ success: false, error: 'العضو غير موجود' }, { status: 404 })
    }

    // Check XP balance
    const { data: xpData } = await supabase
      .from('xp_transactions')
      .select('amount')
      .eq('member_id', member.member_id)

    const currentXp = (xpData || []).reduce((sum, t) => sum + t.amount, 0)

    if (currentXp < gift.cost_xp) {
      return NextResponse.json({ success: false, error: 'النقاط غير كافية' }, { status: 403 })
    }

    // Deduct XP and create redemption record via RPC (uses passed member_id)
    const { data: redeemResult, error: redeemError } = await supabase.rpc('redeem_gift', {
      p_gift_id: gift_id,
      p_member_id: member.member_id,
    })

    if (redeemError || !redeemResult || !redeemResult.success) {
      const message = (redeemResult && redeemResult.message) || redeemError?.message || 'حدث خطأ'
      return NextResponse.json({ success: false, error: message }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'تم طلب الهدية! انتظر موافقة الوالد' })
  } catch (err) {
    console.error('[GHRS REDEEM GIFT] Unexpected error:', err)
    return NextResponse.json({ success: false, error: 'حدث خطأ غير متوقع' }, { status: 500 })
  }
}
