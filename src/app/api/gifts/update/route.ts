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

    const { gift_id, title, description, cost_xp, cost_money, icon, is_active } = await request.json()
    if (!gift_id) {
      return NextResponse.json({ success: false, error: 'معرف الهدية مطلوب' }, { status: 400 })
    }

    const supabase = createServiceRoleClient()

    const { data: gift } = await supabase
      .from('gifts')
      .select('family_id')
      .eq('id', gift_id)
      .single()

    if (!gift) {
      return NextResponse.json({ success: false, error: 'الهدية غير موجودة' }, { status: 404 })
    }

    if (gift.family_id !== member.family_id) {
      return NextResponse.json({ success: false, error: 'الهدية لا تنتمي لعائلتك' }, { status: 403 })
    }

    const updates: Record<string, unknown> = {}
    if (title !== undefined) updates.title = title
    if (description !== undefined) updates.description = description || null
    if (cost_xp !== undefined) updates.cost_xp = cost_xp
    if (cost_money !== undefined) updates.cost_money = cost_money || null
    if (icon !== undefined) updates.icon = icon || null
    if (is_active !== undefined) updates.is_active = is_active

    const { error: updateError } = await supabase
      .from('gifts')
      .update(updates)
      .eq('id', gift_id)

    if (updateError) {
      console.error('[GHRS UPDATE GIFT] Update error:', updateError.message)
      return NextResponse.json({ success: false, error: 'تعذر تحديث الهدية' }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'تم تحديث الهدية بنجاح' })
  } catch (err) {
    console.error('[GHRS UPDATE GIFT] Unexpected error:', err)
    return NextResponse.json({ success: false, error: 'حدث خطأ غير متوقع' }, { status: 500 })
  }
}
