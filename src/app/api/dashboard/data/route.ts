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

    const children = childrenResult.data || []
    const childIds = children.map((c: { id: string }) => c.id)
    const activeTasks = tasksResult.data || []
    const taskIds = activeTasks.map((t: { id: string }) => t.id)

    // Count pending task completions
    let pendingTaskApprovals = 0
    const taskCompletionsByChild: Record<string, number> = {}
    if (taskIds.length > 0) {
      const { data: pendingData } = await supabase
        .from('task_completions')
        .select('id, task_id, member_id')
        .is('approved', null)
        .in('task_id', taskIds)
      pendingTaskApprovals = pendingData?.length || 0
      for (const tc of pendingData || []) {
        if (tc.member_id) {
          taskCompletionsByChild[tc.member_id] = (taskCompletionsByChild[tc.member_id] || 0) + 1
        }
      }
    }

    // Count pending gift redemptions (scoped to this family's gifts)
    const { data: pendingGifts } = await supabase
      .from('gift_redemptions')
      .select('id, gift_id, member_id')
      .eq('status', 'pending')

    const giftIds = (pendingGifts || []).map((g: any) => g.gift_id)
    let pendingGiftApprovals = 0
    const giftRedemptionsByChild: Record<string, number> = {}
    if (giftIds.length > 0) {
      const { data: familyGifts } = await supabase
        .from('gifts')
        .select('id')
        .eq('family_id', familyId)
        .in('id', giftIds)
      const familyGiftIds = new Set((familyGifts || []).map((g: { id: string }) => g.id))
      for (const gr of pendingGifts || []) {
        if (familyGiftIds.has(gr.gift_id) && gr.member_id) {
          giftRedemptionsByChild[gr.member_id] = (giftRedemptionsByChild[gr.member_id] || 0) + 1
          pendingGiftApprovals++
        }
      }
    }

    // Count pending withdrawal requests (scoped to this family)
    const { data: pendingWithdrawals } = await supabase
      .from('withdrawal_requests')
      .select('id, member_id')
      .eq('status', 'pending')

    const withdrawalMemberIds = (pendingWithdrawals || []).map((w: any) => w.member_id)
    let pendingWithdrawalCount = 0
    const withdrawalsByChild: Record<string, number> = {}
    if (withdrawalMemberIds.length > 0) {
      const { data: familyMembers } = await supabase
        .from('members')
        .select('id')
        .eq('family_id', familyId)
        .in('id', withdrawalMemberIds)
      const familyMemberIds = new Set((familyMembers || []).map((m: { id: string }) => m.id))
      for (const w of pendingWithdrawals || []) {
        if (familyMemberIds.has(w.member_id)) {
          withdrawalsByChild[w.member_id] = (withdrawalsByChild[w.member_id] || 0) + 1
          pendingWithdrawalCount++
        }
      }
    }

    // Total pending approvals
    const pendingApprovals = pendingTaskApprovals + pendingGiftApprovals + pendingWithdrawalCount

    // Compute per-child balances (XP + money)
    const xpByChild: Record<string, number> = {}
    const moneyByChild: Record<string, number> = {}
    if (childIds.length > 0) {
      const [xpResult, moneyResult] = await Promise.all([
        supabase.from('xp_transactions').select('member_id, amount').in('member_id', childIds),
        supabase.from('money_transactions').select('member_id, amount, type').eq('status', 'approved').in('member_id', childIds),
      ])
      for (const t of xpResult.data || []) {
        if (t.member_id) xpByChild[t.member_id] = (xpByChild[t.member_id] || 0) + t.amount
      }
      for (const t of moneyResult.data || []) {
        if (t.member_id) {
          const delta = t.type === 'earned' ? t.amount : -t.amount
          moneyByChild[t.member_id] = (moneyByChild[t.member_id] || 0) + delta
        }
      }
    }

    // Enrich children with balances and approval counts
    const enrichedChildren = children.map((c: { id: string; name: string; login_code: string }) => ({
      ...c,
      xp: xpByChild[c.id] || 0,
      money: moneyByChild[c.id] || 0,
      pendingApprovals: (taskCompletionsByChild[c.id] || 0)
        + (giftRedemptionsByChild[c.id] || 0)
        + (withdrawalsByChild[c.id] || 0),
    }))

    return NextResponse.json({
      success: true,
      family: familyResult.data,
      children: enrichedChildren,
      tasks: activeTasks,
      activeTaskCount: activeTasks.length,
      pendingApprovals,
    })
  } catch (err) {
    console.error('[GHRS DASHBOARD DATA] Unexpected error:', err)
    return NextResponse.json({ success: false, error: 'حدث خطأ غير متوقع' }, { status: 500 })
  }
}
