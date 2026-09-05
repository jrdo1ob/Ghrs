import { NextResponse, type NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { validateSession, requireParentRole } from '@/lib/auth/server-session'

export async function POST(request: NextRequest) {
  try {
    const auth = await validateSession(request)
    if (!auth.success || !auth.member) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status })
    }

    const roleCheck = requireParentRole(auth.member)
    if (!roleCheck.ok) {
      return NextResponse.json({ success: false, error: roleCheck.error }, { status: roleCheck.status })
    }

    const body = await request.json()
    if (!body.preset_id) {
      return NextResponse.json({ success: false, error: 'معرّف النموذج مطلوب' }, { status: 400 })
    }

    // Derive family_id and member_id from the validated session, NOT from the browser
    const supabase = createServiceRoleClient()
    const { data: taskId, error } = await supabase.rpc('add_preset_task', {
      p_preset_id: body.preset_id,
      p_family_id: auth.member.family_id,
      p_created_by: auth.member.member_id,
    })

    if (error || !taskId) {
      console.error('[GHRS ADD PRESET TASK] RPC error:', error?.message)
      return NextResponse.json(
        { success: false, error: 'تعذر إضافة المهمة، حاول مرة أخرى' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, task_id: taskId })
  } catch (err) {
    console.error('[GHRS ADD PRESET TASK] Unexpected error:', err)
    return NextResponse.json({ success: false, error: 'حدث خطأ غير متوقع' }, { status: 500 })
  }
}
