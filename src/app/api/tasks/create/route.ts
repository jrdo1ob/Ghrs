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
    const taskData = await request.json()

    if (!taskData.title) {
      return NextResponse.json(
        { success: false, error: 'اسم المهمة مطلوب' },
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

    // 5. Force family_id from authenticated session (NOT from browser)
    const familyId = member.family_id
    const memberId = member.member_id

    // 6. Create the task with server-verified family_id
    const { data: newTask, error: insertError } = await supabase
      .from('tasks')
      .insert({
        family_id: familyId,
        title: taskData.title,
        description: taskData.description || null,
        xp_reward: taskData.xp_reward || 10,
        money_reward: taskData.money_reward || null,
        frequency: taskData.frequency || 'daily',
        priority: taskData.priority || 'medium',
        assigned_to: taskData.assigned_to || null,
        schedule_days: taskData.schedule_days || null,
        requires_approval: taskData.requires_approval !== undefined ? taskData.requires_approval : true,
        is_active: true,
        created_by: memberId,
        task_type: taskData.task_type || 'standard',
        quran_action_type: taskData.quran_action_type || null,
        surah_number: taskData.surah_number || null,
        from_ayah: taskData.from_ayah || null,
        to_ayah: taskData.to_ayah || null,
        custom_title: taskData.custom_title || null,
        custom_content_text: taskData.custom_content_text || null,
        icon: taskData.icon || null,
      })
      .select()
      .single()

    if (insertError) {
      console.error('[GHRS CREATE TASK] Insert error:', insertError.message)
      return NextResponse.json(
        { success: false, error: 'تعذر إنشاء المهمة، حاول مرة أخرى' },
        { status: 500 }
      )
    }

    // 7. Return success
    return NextResponse.json({
      success: true,
      message: 'تم إنشاء المهمة بنجاح',
      task: newTask,
    })
  } catch (err) {
    console.error('[GHRS CREATE TASK] Unexpected error:', err)
    return NextResponse.json(
      { success: false, error: 'حدث خطأ غير متوقع' },
      { status: 500 }
    )
  }
}