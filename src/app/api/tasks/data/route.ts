import { NextResponse, type NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { validateRequestAuth, requireParentRole } from '@/lib/auth/server-session'

export async function POST(request: NextRequest) {
  const t0 = performance.now()
  let tAuth = 0
  let tMembers = 0
  let tTasks = 0
  let tParallel = 0
  let tCompletions: number | null = null
  let failedStage: string | null = 'auth'

  try {
    const authStart = performance.now()
    const session = await validateRequestAuth(request)
    tAuth = performance.now() - authStart
    if (!session.success || !session.member) {
      return NextResponse.json({ success: false, error: session.error }, { status: session.status })
    }

    const roleCheck = requireParentRole(session.member)
    if (!roleCheck.ok) {
      return NextResponse.json({ success: false, error: roleCheck.error }, { status: roleCheck.status })
    }

    const supabase = createServiceRoleClient()
    const familyId = session.member.family_id

    failedStage = 'parallel'
    const parallelStart = performance.now()
    const [childrenResult, tasksResult] = await Promise.all([
      (async () => {
        const s = performance.now()
        const r = await supabase
          .from('members')
          .select('id, name')
          .eq('family_id', familyId)
          .eq('role', 'child')
          .eq('is_deleted', false)
        tMembers = performance.now() - s
        return r
      })(),
      (async () => {
        const s = performance.now()
        const r = await supabase
          .from('tasks')
          .select('*')
          .eq('family_id', familyId)
          .eq('is_deleted', false)
          .order('created_at', { ascending: false })
        tTasks = performance.now() - s
        return r
      })(),
    ])
    tParallel = performance.now() - parallelStart

    const childrenData = childrenResult.data
    const tasksData = tasksResult.data

    // Batch fetch all pending completions in one query
    failedStage = 'completions'
    let completionsByTaskId = new Map<string, any[]>()
    if (tasksData && tasksData.length > 0) {
      const taskIds = tasksData.map(t => t.id)
      const completionsStart = performance.now()
      const { data: allCompletions } = await supabase
        .from('task_completions')
        .select('*')
        .in('task_id', taskIds)
        .is('approved', null)
      tCompletions = performance.now() - completionsStart

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

    console.log(
      `[TasksDataTiming] auth=${Math.round(tAuth)}ms members=${Math.round(tMembers)}ms tasks=${Math.round(tTasks)}ms parallel_data=${Math.round(tParallel)}ms completions=${Math.round(tCompletions ?? 0)}ms total=${Math.round(performance.now() - t0)}ms`
    )

    return NextResponse.json({
      success: true,
      member: {
        member_id: session.member.member_id,
        member_name: session.member.member_name,
        member_role: session.member.member_role,
        family_id: session.member.family_id,
      },
      children: childrenData || [],
      tasks: tasksWithCompletions,
    })
  } catch (err) {
    console.log(
      `[TasksDataTiming] auth=${Math.round(tAuth)}ms parallel_data=${Math.round(tParallel)}ms completions=${tCompletions === null ? 'N/A' : `${Math.round(tCompletions)}ms`} failed_stage=${failedStage ?? 'unknown'} total=${Math.round(performance.now() - t0)}ms`
    )
    console.error('[GHRS TASKS DATA] Unexpected error:', err)
    return NextResponse.json({ success: false, error: 'حدث خطأ غير متوقع' }, { status: 500 })
  }
}