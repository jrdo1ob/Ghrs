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

    const supabase = createServiceRoleClient()
    const familyId = session.member.family_id

    const [childrenResult, tasksResult, currencyResult] = await Promise.all([
      supabase
        .from('members')
        .select('id, name')
        .eq('family_id', familyId)
        .eq('role', 'child')
        .eq('is_deleted', false),
      supabase
        .from('tasks')
        .select('*')
        .eq('family_id', familyId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false }),
      supabase.from('families').select('currency').eq('id', familyId).single(),
    ])

    const childrenData = childrenResult.data
    const tasksData = tasksResult.data

    // Batch fetch all pending completions in one query
    let completionsByTaskId = new Map<string, any[]>()
    if (tasksData && tasksData.length > 0) {
      const taskIds = tasksData.map(t => t.id)
      const { data: allCompletions } = await supabase
        .from('task_completions')
        .select('*')
        .in('task_id', taskIds)
        .is('approved', null)

      for (const c of allCompletions || []) {
        const existing = completionsByTaskId.get(c.task_id) || []
        existing.push(c)
        completionsByTaskId.set(c.task_id, existing)
      }
    }

    const tasksWithCompletions = (tasksData || []).map(task => {
      const completions = completionsByTaskId.get(task.id) || []
      return { ...task, completions, pendingCount: completions.length }
    })

    return NextResponse.json({
      success: true,
      member: {
        member_id: session.member.member_id,
        member_name: session.member.member_name,
        member_role: session.member.member_role,
        family_id: session.member.family_id,
      },
      currency: currencyResult.data?.currency || 'KWD',
      children: childrenData || [],
      tasks: tasksWithCompletions,
    })
  } catch (err) {
    console.error('[GHRS TASKS DATA] Unexpected error:', err)
    return NextResponse.json({ success: false, error: 'حدث خطأ غير متوقع' }, { status: 500 })
  }
}