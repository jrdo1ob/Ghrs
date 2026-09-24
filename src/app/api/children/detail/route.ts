import { NextResponse, type NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { validateRequestAuth, requireParentRole, verifyRecordBelongsToFamily } from '@/lib/auth/server-session'

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

    const { child_id } = await request.json()
    if (!child_id) {
      return NextResponse.json({ success: false, error: 'معرف الطفل مطلوب' }, { status: 400 })
    }

    const supabase = createServiceRoleClient()

    // Verify child belongs to parent's family
    const ownership = await verifyRecordBelongsToFamily(supabase, 'members', child_id, session.member.family_id)
    if (!ownership.ok) {
      return NextResponse.json({ success: false, error: ownership.error }, { status: ownership.status })
    }

    // Fetch child profile
    const { data: child, error: childError } = await supabase
      .from('members')
      .select('id, name, role, current_streak, longest_streak, grace_shields, last_active_date')
      .eq('id', child_id)
      .single()

    if (childError || !child || child.role !== 'child') {
      return NextResponse.json({ success: false, error: 'الطفل غير موجود' }, { status: 404 })
    }

    // Fetch XP transactions
    const { data: xpData } = await supabase
      .from('xp_transactions')
      .select('amount, source, description, created_at')
      .eq('member_id', child_id)
      .order('created_at', { ascending: false })
      .limit(20)

    const xpTotal = (xpData || []).reduce((sum: number, t: any) => sum + t.amount, 0)

    // Fetch money balance
    const { data: moneyData } = await supabase
      .from('money_transactions')
      .select('amount, type, status')
      .eq('member_id', child_id)
      .eq('status', 'approved')

    const moneyBalance = (moneyData || []).reduce(
      (sum: number, t: any) => sum + (t.type === 'earned' ? t.amount : -t.amount),
      0
    )

    // Fetch recent task completions
    const { data: completions } = await supabase
      .from('task_completions')
      .select('id, task_id, approved, completed_at')
      .eq('member_id', child_id)
      .order('completed_at', { ascending: false })
      .limit(10)

    // Fetch task titles for completions
    const taskIds = [...new Set((completions || []).map((c: any) => c.task_id))]
    const { data: tasks } = await supabase
      .from('tasks')
      .select('id, title')
      .in('id', taskIds.length > 0 ? taskIds : ['00000000-0000-0000-0000-000000000000'])

    const taskMap = new Map((tasks || []).map((t: any) => [t.id, t.title]))

    const taskHistory = (completions || []).map((c: any) => ({
      id: c.id,
      task_title: taskMap.get(c.task_id) || 'مهمة',
      approved: c.approved,
      completed_at: c.completed_at,
    }))

    // Fetch achievements
    const { data: achievements } = await supabase
      .from('member_achievements')
      .select('id, achievement_id, earned_at')
      .eq('member_id', child_id)

    const { data: achievementDefs } = await supabase
      .from('achievement_definitions')
      .select('id, title, description, icon, xp_reward')

    const achievementMap = new Map((achievementDefs || []).map((a: any) => [a.id, a]))
    const earnedAchievements = (achievements || []).map((a: any) => ({
      ...a,
      ...(achievementMap.get(a.achievement_id) || {}),
    }))

    return NextResponse.json({
      success: true,
      child,
      xp: xpTotal,
      money: moneyBalance,
      xp_history: xpData || [],
      task_history: taskHistory,
      achievements: earnedAchievements,
      total_achievements: (achievementDefs || []).length,
    })
  } catch (err) {
    console.error('[GHRS CHILD DETAIL] Unexpected error:', err)
    return NextResponse.json({ success: false, error: 'حدث خطأ غير متوقع' }, { status: 500 })
  }
}
