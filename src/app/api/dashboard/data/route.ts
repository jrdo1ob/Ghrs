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

    const [familyResult, childrenResult, tasksResult] = await Promise.all([
      supabase.from('families').select('name, code').eq('id', familyId).single(),
      supabase.from('members').select('id, name, login_code').eq('family_id', familyId).eq('role', 'child').order('created_at', { ascending: true }),
      supabase.from('tasks').select('id').eq('family_id', familyId).eq('is_active', true),
    ])

    const activeTasks = tasksResult.data || []
    const taskIds = activeTasks.map((t: { id: string }) => t.id)

    let pendingApprovals = 0
    if (taskIds.length > 0) {
      const { data: pendingData } = await supabase
        .from('task_completions')
        .select('id')
        .is('approved', null)
        .in('task_id', taskIds)
      pendingApprovals = pendingData?.length || 0
    }

    return NextResponse.json({
      success: true,
      family: familyResult.data,
      children: childrenResult.data || [],
      tasks: activeTasks,
      activeTaskCount: activeTasks.length,
      pendingApprovals,
    })
  } catch (err) {
    console.error('[GHRS DASHBOARD DATA] Unexpected error:', err)
    return NextResponse.json({ success: false, error: 'حدث خطأ غير متوقع' }, { status: 500 })
  }
}