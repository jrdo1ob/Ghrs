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

    const { task_id } = await request.json()
    if (!task_id) {
      return NextResponse.json({ success: false, error: 'معرف المهمة مطلوب' }, { status: 400 })
    }

    const supabase = createServiceRoleClient()

    const { data: task } = await supabase
      .from('tasks')
      .select('family_id')
      .eq('id', task_id)
      .single()

    if (!task) {
      return NextResponse.json({ success: false, error: 'المهمة غير موجودة' }, { status: 404 })
    }

    if (task.family_id !== member.family_id) {
      return NextResponse.json({ success: false, error: 'المهمة لا تنتمي لعائلتك' }, { status: 403 })
    }

    const { data: paused, error: toggleError } = await supabase.rpc('toggle_task_pause', {
      p_task_id: task_id,
    })

    if (toggleError) {
      console.error('[GHRS TOGGLE PAUSE] RPC error:', toggleError.message)
      return NextResponse.json({ success: false, error: 'حدث خطأ' }, { status: 500 })
    }

    return NextResponse.json({ success: true, is_paused: !!paused })
  } catch (err) {
    console.error('[GHRS TOGGLE PAUSE] Unexpected error:', err)
    return NextResponse.json({ success: false, error: 'حدث خطأ غير متوقع' }, { status: 500 })
  }
}
