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

    const { task_id } = await request.json()
    if (!task_id) {
      return NextResponse.json({ success: false, error: 'معرف المهمة مطلوب' }, { status: 400 })
    }

    const supabase = createServiceRoleClient()

    const { data: task } = await supabase
      .from('tasks')
      .select('family_id, is_paused')
      .eq('id', task_id)
      .single()

    if (!task) {
      return NextResponse.json({ success: false, error: 'المهمة غير موجودة' }, { status: 404 })
    }

    if (task.family_id !== member.family_id) {
      return NextResponse.json({ success: false, error: 'المهمة لا تنتمي لعائلتك' }, { status: 403 })
    }

    // Toggle is_paused, replicating the RPC body (is_paused = NOT is_paused)
    const newPaused = !task.is_paused

    const { error: toggleError } = await supabase
      .from('tasks')
      .update({ is_paused: newPaused })
      .eq('id', task_id)

    if (toggleError) {
      console.error('[GHRS TOGGLE PAUSE] Update error:', toggleError.message)
      return NextResponse.json({ success: false, error: 'حدث خطأ' }, { status: 500 })
    }

    return NextResponse.json({ success: true, is_paused: newPaused })
  } catch (err) {
    console.error('[GHRS TOGGLE PAUSE] Unexpected error:', err)
    return NextResponse.json({ success: false, error: 'حدث خطأ غير متوقع' }, { status: 500 })
  }
}
