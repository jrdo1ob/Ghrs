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

    const familyId = session.member.family_id
    const memberId = session.member.member_id

    // 2. Parse request body
    const taskData = await request.json()

    if (!taskData.title) {
      return NextResponse.json(
        { success: false, error: 'اسم المهمة مطلوب' },
        { status: 400 }
      )
    }

    const supabase = createServiceRoleClient()

    // Validate assigned_to members belong to the session family
    const assignedTo = taskData.assigned_to
      ? taskData.assigned_to
      : null

    if (assignedTo && Array.isArray(assignedTo) && assignedTo.length > 0) {
      const ownership = await verifyMembersBelongToFamily(supabase, assignedTo, familyId)
      if (!ownership.ok) {
        return NextResponse.json(
          { success: false, error: ownership.error },
          { status: ownership.status }
        )
      }
    }

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
        assigned_to: assignedTo || null,
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