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

    const familyId = session.member.family_id
    const supabase = createServiceRoleClient()

    // 1. Get pending task completions
    const { data: taskCompletions } = await supabase
      .from('task_completions')
      .select('id, task_id, member_id, completed_at')
      .is('approved', null)

    const taskIds = (taskCompletions || []).map((tc: any) => tc.task_id)
    const memberIds = [...new Set((taskCompletions || []).map((tc: any) => tc.member_id))]

    // Get task details
    const { data: tasks } = await supabase
      .from('tasks')
      .select('id, title, xp_reward, money_reward, family_id')
      .in('id', taskIds.length > 0 ? taskIds : ['00000000-0000-0000-0000-000000000000'])

    // Get child names
    const { data: members } = await supabase
      .from('members')
      .select('id, name')
      .in('id', memberIds.length > 0 ? memberIds : ['00000000-0000-0000-0000-000000000000'])

    const taskMap = new Map((tasks || []).map((t: any) => [t.id, t]))
    const memberMap = new Map((members || []).map((m: any) => [m.id, m]))

    const taskApprovals = (taskCompletions || [])
      .filter((tc: any) => {
        const task = taskMap.get(tc.task_id)
        return task && task.family_id === familyId
      })
      .map((tc: any) => {
        const task = taskMap.get(tc.task_id)
        const member = memberMap.get(tc.member_id)
        return {
          id: tc.id,
          type: 'task',
          child_name: member?.name || 'طفل',
          item_name: task?.title || 'مهمة',
          xp_reward: task?.xp_reward || 0,
          money_reward: task?.money_reward || 0,
          requested_at: tc.completed_at,
          status: 'pending',
        }
      })

    // 2. Get pending gift redemptions
    const { data: giftRedemptions } = await supabase
      .from('gift_redemptions')
      .select('id, gift_id, member_id, requested_xp_cost, status, redeemed_at')
      .eq('status', 'pending')

    const giftIds = (giftRedemptions || []).map((gr: any) => gr.gift_id)
    const giftMemberIds = [...new Set((giftRedemptions || []).map((gr: any) => gr.member_id))]

    const { data: gifts } = await supabase
      .from('gifts')
      .select('id, title, family_id')
      .in('id', giftIds.length > 0 ? giftIds : ['00000000-0000-0000-0000-000000000000'])

    const { data: giftMembers } = await supabase
      .from('members')
      .select('id, name')
      .in('id', giftMemberIds.length > 0 ? giftMemberIds : ['00000000-0000-0000-0000-000000000000'])

    const giftMap = new Map((gifts || []).map((g: any) => [g.id, g]))
    const giftMemberMap = new Map((giftMembers || []).map((m: any) => [m.id, m]))

    const giftApprovals = (giftRedemptions || [])
      .filter((gr: any) => {
        const gift = giftMap.get(gr.gift_id)
        return gift && gift.family_id === familyId
      })
      .map((gr: any) => {
        const gift = giftMap.get(gr.gift_id)
        const member = giftMemberMap.get(gr.member_id)
        return {
          id: gr.id,
          type: 'gift',
          child_name: member?.name || 'طفل',
          item_name: gift?.title || 'هدية',
          xp_cost: gr.requested_xp_cost || 0,
          requested_at: gr.redeemed_at,
          status: gr.status,
        }
      })

    // 3. Get pending withdrawal requests
    const { data: withdrawals } = await supabase
      .from('withdrawal_requests')
      .select('id, member_id, amount, status, requested_at')
      .eq('status', 'pending')

    const withdrawalMemberIds = [...new Set((withdrawals || []).map((w: any) => w.member_id))]
    const { data: withdrawalMembers } = await supabase
      .from('members')
      .select('id, name')
      .in('id', withdrawalMemberIds.length > 0 ? withdrawalMemberIds : ['00000000-0000-0000-0000-000000000000'])

    const withdrawalMemberMap = new Map((withdrawalMembers || []).map((m: any) => [m.id, m]))

    const withdrawalApprovals = (withdrawals || [])
      .map((w: any) => {
        const member = withdrawalMemberMap.get(w.member_id)
        return {
          id: w.id,
          type: 'withdrawal',
          child_name: member?.name || 'طفل',
          amount: w.amount,
          requested_at: w.requested_at,
          status: w.status,
        }
      })

    // 4. Combine all approvals
    const allApprovals = [...taskApprovals, ...giftApprovals, ...withdrawalApprovals]

    // 5. Count pending
    const pendingCount = allApprovals.filter(a => a.status === 'pending').length

    return NextResponse.json({
      success: true,
      approvals: allApprovals,
      pendingCount,
      counts: {
        tasks: taskApprovals.length,
        gifts: giftApprovals.length,
        withdrawals: withdrawalApprovals.length,
      },
    })
  } catch (err) {
    console.error('[GHRS APPROVALS] Unexpected error:', err)
    return NextResponse.json({ success: false, error: 'حدث خطأ غير متوقع' }, { status: 500 })
  }
}
