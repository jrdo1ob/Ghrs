import { NextResponse, type NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { validateRequestAuth, requireParentRole } from '@/lib/auth/server-session'

export async function POST(request: NextRequest) {
  try {
    const session = await validateRequestAuth(request)
    if (!session.success || !session.member) {
      return NextResponse.json({ success: false, error: session.error }, { status: session.status })
    }

    const roleCheck = requireParentRole(session.member)
    if (!roleCheck.ok) {
      return NextResponse.json({ success: false, error: roleCheck.error }, { status: roleCheck.status })
    }

    // 2. Parse request body
    const { completion_id, reason = null } = await request.json()

    if (!completion_id) {
      return NextResponse.json(
        { success: false, error: 'معرف الإنجاز مطلوب' },
        { status: 400 }
      )
    }

    // 3. Verify completion belongs to the same family
    const supabase = createServiceRoleClient()

    const { data: completionData, error: completionError } = await supabase
      .from('task_completions')
      .select('id, task_id')
      .eq('id', completion_id)
      .single()

    if (completionError || !completionData) {
      return NextResponse.json(
        { success: false, error: 'الإنجاز غير موجود' },
        { status: 404 }
      )
    }

    // Get task to verify family ownership
    const { data: taskData, error: taskError } = await supabase
      .from('tasks')
      .select('family_id')
      .eq('id', completionData.task_id)
      .single()

    if (taskError || !taskData) {
      return NextResponse.json(
        { success: false, error: 'المهمة غير موجودة' },
        { status: 404 }
      )
    }

    if (taskData.family_id !== session.member.family_id) {
      return NextResponse.json(
        { success: false, error: 'الإنجاز لا ينتمي لعائلتك' },
        { status: 403 }
      )
    }

    // 6. Call revoke_task_approval with verified member_id
    const { data, error } = await supabase.rpc('revoke_task_approval', {
      p_completion_id: completion_id,
      p_reason: reason,
    })

    if (error) {
      console.error('[GHRS REVOKE] RPC error:', error.message)
      return NextResponse.json(
        { success: false, error: 'حدث خطأ أثناء سحب الاعتماد' },
        { status: 500 }
      )
    }

    // 7. Return success
    return NextResponse.json({
      success: true,
      message: 'تم سحب الاعتماد بنجاح',
      data: data,
    })
  } catch (err) {
    console.error('[GHRS REVOKE] Unexpected error:', err)
    return NextResponse.json(
      { success: false, error: 'حدث خطأ غير متوقع' },
      { status: 500 }
    )
  }
}