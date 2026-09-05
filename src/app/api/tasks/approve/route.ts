import { NextResponse, type NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

export async function POST(request: NextRequest) {
  try {
    // 1. Read session token from HttpOnly cookie
    const sessionToken = request.cookies.get('ghrs_member_session')?.value

    if (!sessionToken) {
      return NextResponse.json(
        { success: false, error: 'يجب تسجيل الدخول أولاً' },
        { status: 401 }
      )
    }

    // 2. Parse request body
    const { completion_id, approve = true, reason = null } = await request.json()

    if (!completion_id) {
      return NextResponse.json(
        { success: false, error: 'معرف الإنجاز مطلوب' },
        { status: 400 }
      )
    }

    // 3. Validate session using server-side RPC
    const supabase = createServiceRoleClient()

    const { data: sessionData, error: sessionError } = await supabase.rpc('validate_member_session', {
      p_session_token: sessionToken,
    })

    if (sessionError || !sessionData || sessionData.length === 0) {
      return NextResponse.json(
        { success: false, error: 'جلسة غير صالحة أو منتهية' },
        { status: 401 }
      )
    }

    const member = sessionData[0]

    // 4. Verify role === 'parent' or 'owner'
    if (member.member_role !== 'parent' && member.member_role !== 'owner') {
      return NextResponse.json(
        { success: false, error: 'هذه العملية مخصصة للوالدين فقط' },
        { status: 403 }
      )
    }

    // 5. Verify completion belongs to the same family
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

    if (taskData.family_id !== member.family_id) {
      return NextResponse.json(
        { success: false, error: 'الإنجاز لا ينتمي لعائلتك' },
        { status: 403 }
      )
    }

    // 6. Call approve_task_completion with verified member_id
    const { data, error } = await supabase.rpc('approve_task_completion', {
      p_completion_id: completion_id,
      p_approve: approve,
      p_reason: reason,
    })

    if (error) {
      console.error('[GHRS APPROVE] RPC error:', error.message)
      return NextResponse.json(
        { success: false, error: 'حدث خطأ أثناء الاعتماد' },
        { status: 500 }
      )
    }

    // 7. Return success
    return NextResponse.json({
      success: true,
      message: approve ? 'تمت الموافقة!' : 'تم رفض الإنجاز',
      data: data,
    })
  } catch (err) {
    console.error('[GHRS APPROVE] Unexpected error:', err)
    return NextResponse.json(
      { success: false, error: 'حدث خطأ غير متوقع' },
      { status: 500 }
    )
  }
}