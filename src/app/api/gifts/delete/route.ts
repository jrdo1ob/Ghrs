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

    const { gift_id } = await request.json()
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

    const { error: deleteError } = await supabase
      .from('gifts')
      .delete()
      .eq('id', gift_id)

    if (deleteError) {
      console.error('[GHRS DELETE GIFT] Delete error:', deleteError.message)
      return NextResponse.json({ success: false, error: 'تعذر حذف الهدية' }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'تم حذف الهدية بنجاح' })
  } catch (err) {
    console.error('[GHRS DELETE GIFT] Unexpected error:', err)
    return NextResponse.json({ success: false, error: 'حدث خطأ غير متوقع' }, { status: 500 })
  }
}
