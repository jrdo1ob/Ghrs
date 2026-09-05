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

    const { title, description, cost_xp, cost_money, icon } = await request.json()
    if (!title || !cost_xp) {
      return NextResponse.json({ success: false, error: 'عنوان الهدية وتكلفتها مطلوبان' }, { status: 400 })
    }

    const supabase = createServiceRoleClient()

    // family_id MUST come from session, never from browser
    const { data: gift, error: insertError } = await supabase
      .from('gifts')
      .insert({
        family_id: member.family_id,
        title,
        description: description || null,
        cost_xp,
        cost_money: cost_money || null,
        icon: icon || null,
        is_active: true,
        created_by: member.member_id,
      })
      .select()
      .single()

    if (insertError) {
      console.error('[GHRS CREATE GIFT] Insert error:', insertError.message)
      return NextResponse.json({ success: false, error: 'تعذر إنشاء الهدية' }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'تم إنشاء الهدية بنجاح', gift })
  } catch (err) {
    console.error('[GHRS CREATE GIFT] Unexpected error:', err)
    return NextResponse.json({ success: false, error: 'حدث خطأ غير متوقع' }, { status: 500 })
  }
}
