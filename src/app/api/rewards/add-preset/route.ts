import { NextResponse, type NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { validateRequestAuth, requireParentRole } from '@/lib/auth/server-session'

export async function POST(request: NextRequest) {
  try {
    const session = await validateRequestAuth(request)
    if (!session.success || !session.member) {
      return NextResponse.json({ success: false, error: session.error }, { status: session.status })
    }

    const member = session.member

    const roleCheck = requireParentRole(member)
    if (!roleCheck.ok) {
      return NextResponse.json({ success: false, error: roleCheck.error }, { status: roleCheck.status })
    }

    const { preset_id, custom_xp, custom_price } = await request.json()
    if (!preset_id) {
      return NextResponse.json({ success: false, error: 'معرّف المكافأة مطلوب' }, { status: 400 })
    }

    // family_id MUST come from the validated session, never from the browser
    const supabase = createServiceRoleClient()
    const { data: giftId, error } = await supabase.rpc('add_preset_reward', {
      p_preset_id: preset_id,
      p_family_id: member.family_id,
      p_custom_xp: typeof custom_xp === 'number' ? custom_xp : null,
      p_custom_price: typeof custom_price === 'number' ? custom_price : null,
    })

    if (error || !giftId) {
      console.error('[GHRS ADD PRESET REWARD] RPC error:', error?.message)
      return NextResponse.json(
        { success: false, error: 'تعذر إضافة المكافأة، حاول مرة أخرى' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, message: 'تمت إضافة المكافأة لمتجر العائلة بنجاح', gift_id: giftId })
  } catch (err) {
    console.error('[GHRS ADD PRESET REWARD] Unexpected error:', err)
    return NextResponse.json({ success: false, error: 'حدث خطأ غير متوقع' }, { status: 500 })
  }
}