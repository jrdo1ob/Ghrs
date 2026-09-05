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
    const { task_id, ...taskData } = await request.json()

    if (!task_id) {
      return NextResponse.json(
        { success: false, error: 'معرف المهمة مطلوب' },
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

    // 5. Load target task and verify family ownership
    const { data: existingTask, error: taskError } = await supabase
      .from('tasks')
      .select('id, family_id')
      .eq('id', task_id)
      .single()

    if (taskError || !existingTask) {
      return NextResponse.json(
        { success: false, error: 'المهمة غير موجودة' },
        { status: 404 }
      )
    }

    if (existingTask.family_id !== member.family_id) {
      return NextResponse.json(
        { success: false, error: 'المهمة لا تنتمي لعائلتك' },
        { status: 403 }
      )
    }

    // 6. Update the task
    const { error: updateError } = await supabase
      .from('tasks')
      .update({
        title: taskData.title,
        description: taskData.description || null,
        xp_reward: taskData.xp_reward,
        money_reward: taskData.money_reward || null,
        frequency: taskData.frequency,
        priority: taskData.priority,
        assigned_to: taskData.assigned_to || null,
        schedule_days: taskData.schedule_days || null,
        requires_approval: taskData.requires_approval,
        task_type: taskData.task_type || 'standard',
        quran_action_type: taskData.quran_action_type || null,
        surah_number: taskData.surah_number || null,
        from_ayah: taskData.from_ayah || null,
        to_ayah: taskData.to_ayah || null,
        custom_title: taskData.custom_title || null,
        custom_content_text: taskData.custom_content_text || null,
        icon: taskData.icon || null,
      })
      .eq('id', task_id)

    if (updateError) {
      console.error('[GHRS UPDATE TASK] Update error:', updateError.message)
      return NextResponse.json(
        { success: false, error: 'تعذر تعديل المهمة، حاول مرة أخرى' },
        { status: 500 }
      )
    }

    // 7. Return success
    return NextResponse.json({
      success: true,
      message: 'تم تعديل المهمة بنجاح',
    })
  } catch (err) {
    console.error('[GHRS UPDATE TASK] Unexpected error:', err)
    return NextResponse.json(
      { success: false, error: 'حدث خطأ غير متوقع' },
      { status: 500 }
    )
  }
}