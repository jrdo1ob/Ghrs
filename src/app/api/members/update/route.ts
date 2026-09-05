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

    const { member_id, name, pin } = await request.json()
    if (!member_id) {
      return NextResponse.json({ success: false, error: 'معرف العضو مطلوب' }, { status: 400 })
    }

    const supabase = createServiceRoleClient()

    // Verify target member belongs to the session family
    const { data: target } = await supabase
      .from('members')
      .select('family_id, role')
      .eq('id', member_id)
      .single()

    if (!target) {
      return NextResponse.json({ success: false, error: 'العضو غير موجود' }, { status: 404 })
    }

    if (target.family_id !== member.family_id) {
      return NextResponse.json({ success: false, error: 'العضو لا ينتمي لعائلتك' }, { status: 403 })
    }

    // Prevent changing family through update
    // Build update payload; NEVER include family_id
    const updates: Record<string, unknown> = {}
    if (name !== undefined && name !== null) {
      if (typeof name !== 'string' || !name.trim()) {
        return NextResponse.json({ success: false, error: 'الاسم مطلوب' }, { status: 400 })
      }
      updates.name = name.trim()
    }

    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await supabase
        .from('members')
        .update(updates)
        .eq('id', member_id)

      if (updateError) {
        console.error('[GHRS UPDATE MEMBER] Update error:', updateError.message)
        return NextResponse.json({ success: false, error: 'تعذر تحديث العضو' }, { status: 500 })
      }
    }

    // Set PIN if provided
    if (pin && typeof pin === 'string' && pin.length >= 4) {
      const { error: pinError } = await supabase.rpc('set_member_pin', {
        p_member_id: member_id,
        p_pin: pin,
      })
      if (pinError) {
        console.error('[GHRS UPDATE MEMBER] PIN error:', pinError.message)
        return NextResponse.json({ success: false, error: 'تعذر تحديث الرمز' }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true, message: 'تم تحديث العضو بنجاح' })
  } catch (err) {
    console.error('[GHRS UPDATE MEMBER] Unexpected error:', err)
    return NextResponse.json({ success: false, error: 'حدث خطأ غير متوقع' }, { status: 500 })
  }
}
