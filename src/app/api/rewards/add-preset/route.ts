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

    // family_id and created_by MUST come from the validated session, never from the browser
    const supabase = createServiceRoleClient()

    // Load the global preset; it is shared reference data, safe to read.
    const { data: preset, error: presetError } = await supabase
      .from('reward_presets')
      .select('id, title, description, default_xp, default_price')
      .eq('id', preset_id)
      .single()

    if (presetError || !preset) {
      return NextResponse.json({ success: false, error: 'نموذج المكافأة غير موجود' }, { status: 404 })
    }

    const { data: gift, error } = await supabase
      .from('gifts')
      .insert({
        family_id: member.family_id,
        title: preset.title,
        description: preset.description || null,
        cost_xp: typeof custom_xp === 'number' ? custom_xp : preset.default_xp,
        cost_money: typeof custom_price === 'number' ? custom_price : preset.default_price,
        is_active: true,
        created_by: member.member_id,
      })
      .select()
      .single()

    if (error || !gift) {
      console.error('[GHRS ADD PRESET REWARD] Insert error:', error?.message)
      return NextResponse.json(
        { success: false, error: 'تعذر إضافة المكافأة من بنك الهدايا، حاول مرة أخرى' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, message: 'تمت إضافة المكافأة لمتجر العائلة بنجاح', gift, gift_id: gift.id })
  } catch (err) {
    console.error('[GHRS ADD PRESET REWARD] Unexpected error:', err)
    return NextResponse.json({ success: false, error: 'حدث خطأ غير متوقع' }, { status: 500 })
  }
}