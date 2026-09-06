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
      .select('family_id')
      .eq('id', task_id)
      .single()

    if (!task) {
      return NextResponse.json({ success: false, error: 'المهمة غير موجودة' }, { status: 404 })
    }

    if (task.family_id !== member.family_id) {
      return NextResponse.json({ success: false, error: 'المهمة لا تنتمي لعائلتك' }, { status: 403 })
    }

    // Soft delete, replicating the RPC body (is_deleted = TRUE, deleted_at = NOW())
    const { error: deleteError } = await supabase
      .from('tasks')
      .update({ is_deleted: true, deleted_at: new Date().toISOString() })
      .eq('id', task_id)

    if (deleteError) {
      console.error('[GHRS DELETE TASK] Update error:', deleteError.message)
      return NextResponse.json({ success: false, error: 'تعذر حذف المهمة' }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'تم حذف المهمة بنجاح' })
  } catch (err) {
    console.error('[GHRS DELETE TASK] Unexpected error:', err)
    return NextResponse.json({ success: false, error: 'حدث خطأ غير متوقع' }, { status: 500 })
  }
}
