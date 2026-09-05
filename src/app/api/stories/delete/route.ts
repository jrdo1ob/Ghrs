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

    if (member.member_role !== 'parent' && member.member_role !== 'owner') {
      return NextResponse.json({ success: false, error: 'هذه العملية مخصصة للوالدين فقط' }, { status: 403 })
    }

    const { story_id } = await request.json()
    if (!story_id) {
      return NextResponse.json({ success: false, error: 'معرف القصة مطلوب' }, { status: 400 })
    }

    const supabase = createServiceRoleClient()

    const { data: story } = await supabase
      .from('stories')
      .select('family_id')
      .eq('id', story_id)
      .single()

    if (!story) {
      return NextResponse.json({ success: false, error: 'القصة غير موجودة' }, { status: 404 })
    }

    if (story.family_id !== member.family_id) {
      return NextResponse.json({ success: false, error: 'القصة لا تنتمي لعائلتك' }, { status: 403 })
    }

    const { error: deleteError } = await supabase
      .from('stories')
      .delete()
      .eq('id', story_id)

    if (deleteError) {
      console.error('[GHRS DELETE STORY] Delete error:', deleteError.message)
      return NextResponse.json({ success: false, error: 'حدث خطأ' }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'تم حذف القصة' })
  } catch (err) {
    console.error('[GHRS DELETE STORY] Unexpected error:', err)
    return NextResponse.json({ success: false, error: 'حدث خطأ غير متوقع' }, { status: 500 })
  }
}
