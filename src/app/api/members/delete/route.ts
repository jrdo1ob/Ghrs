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

    const { member_id } = await request.json()
    if (!member_id) {
      return NextResponse.json({ success: false, error: 'معرف العضو مطلوب' }, { status: 400 })
    }

    const supabase = createServiceRoleClient()

    const { data: target, error: fetchError } = await supabase
      .from('members')
      .select('family_id, role')
      .eq('id', member_id)
      .single()

    if (fetchError || !target) {
      return NextResponse.json({ success: false, error: 'العضو غير موجود' }, { status: 404 })
    }

    if (target.family_id !== member.family_id) {
      return NextResponse.json({ success: false, error: 'العضو لا ينتمي لعائلتك' }, { status: 403 })
    }

    if (target.role === 'owner') {
      return NextResponse.json({ success: false, error: 'لا يمكن حذف المالك' }, { status: 403 })
    }

    const { error: deleteError } = await supabase
      .from('members')
      .delete()
      .eq('id', member_id)

    if (deleteError) {
      console.error('[GHRS DELETE MEMBER] Delete error:', deleteError.message)
      return NextResponse.json({ success: false, error: 'تعذر حذف العضو' }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'تم حذف العضو بنجاح' })
  } catch (err) {
    console.error('[GHRS DELETE MEMBER] Unexpected error:', err)
    return NextResponse.json({ success: false, error: 'حدث خطأ غير متوقع' }, { status: 500 })
  }
}
