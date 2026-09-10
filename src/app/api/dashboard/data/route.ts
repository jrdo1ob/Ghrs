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

    // Count pending task completions
    let pendingTaskApprovals = 0
    if (taskIds.length > 0) {
      const { data: pendingData } = await supabase
        .from('task_completions')
        .select('id, task_id')
        .is('approved', null)
        .in('task_id', taskIds)
      pendingTaskApprovals = pendingData?.length || 0
    }

    // Count pending gift redemptions
    const { data: pendingGifts } = await supabase
      .from('gift_redemptions')
      .select('id, gift_id')
      .eq('status', 'pending')

    // Filter gift redemptions to this family
    const giftIds = (pendingGifts || []).map((g: any) => g.gift_id)
    let pendingGiftApprovals = 0
    if (giftIds.length > 0) {
      const { data: familyGifts } = await supabase
        .from('gifts')
        .select('id')
        .eq('family_id', familyId)
        .in('id', giftIds)
      pendingGiftApprovals = familyGifts?.length || 0
    }

    // Count pending withdrawal requests
    const { data: pendingWithdrawals } = await supabase
      .from('withdrawal_requests')
      .select('id, member_id')
      .eq('status', 'pending')

    // Filter withdrawals to this family
    const withdrawalMemberIds = (pendingWithdrawals || []).map((w: any) => w.member_id)
    let pendingWithdrawalCount = 0
    if (withdrawalMemberIds.length > 0) {
      const { data: familyMembers } = await supabase
        .from('members')
        .select('id')
        .eq('family_id', familyId)
        .in('id', withdrawalMemberIds)
      pendingWithdrawalCount = familyMembers?.length || 0
    }

    // Total pending approvals
    const pendingApprovals = pendingTaskApprovals + pendingGiftApprovals + pendingWithdrawalCount

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
