import { NextResponse, type NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { validateRequestAuth, requireParentRole, verifyMembersBelongToFamily } from '@/lib/auth/server-session'

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
    const { task_id, ...taskData } = await request.json()

    if (!task_id) {
      return NextResponse.json(
        { success: false, error: 'معرف المهمة مطلوب' },
        { status: 400 }
      )
    }

    // 3. Load target task and verify family ownership
    const supabase = createServiceRoleClient()

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

    if (existingTask.family_id !== session.member.family_id) {
      return NextResponse.json(
        { success: false, error: 'المهمة لا تنتمي لعائلتك' },
        { status: 403 }
      )
    }

    let assignedTo = taskData.assigned_to || null

    if (assignedTo && Array.isArray(assignedTo) && assignedTo.length > 0) {
      const ownership = await verifyMembersBelongToFamily(supabase, assignedTo, session.member.family_id)
      if (!ownership.ok) {
        return NextResponse.json(
          { success: false, error: ownership.error },
          { status: ownership.status }
        )
      }
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
        assigned_to: assignedTo,
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