import { NextResponse, type NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { validateRequestAuth } from '@/lib/auth/server-session'

export async function POST(request: NextRequest) {
  try {
    const session = await validateRequestAuth(request)
    if (!session.success || !session.member) {
      return NextResponse.json({ success: false, error: session.error }, { status: session.status })
    }

    if (session.member.member_role !== 'child') {
      return NextResponse.json({ success: false, error: 'هذه الصفحة مخصصة للأطفال فقط' }, { status: 403 })
    }

    const { section = 'home' } = await request.json()

    const supabase = createServiceRoleClient()
    const memberId = session.member.member_id
    const familyId = session.member.family_id

    const { data: memberData, error: memberError } = await supabase
      .from('members')
      .select('id, name, role, login_code, current_streak, longest_streak, grace_shields, last_active_date')
      .eq('id', memberId)
      .single()

    if (memberError || !memberData || memberData.role !== 'child') {
      return NextResponse.json({ success: false, error: 'العضو غير موجود' }, { status: 401 })
    }

    // Validate section against member identity (never trust client-supplied member_id)
    if (section !== 'home' && section !== 'tasks' && section !== 'gifts' && section !== 'garden' && section !== 'profile') {
      return NextResponse.json({ success: false, error: 'قسم غير معروف' }, { status: 400 })
    }

    const today = new Date().toISOString().split('T')[0]
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()

    // 'home' — full dashboard for the child
    if (section === 'home') {
      const [tasksResult, allXpResult, moneyResult, completionsResult] = await Promise.all([
        supabase.from('tasks').select('id, title, xp_reward, money_reward, requires_approval, task_type, quran_action_type, icon, description')
          .eq('family_id', familyId).eq('is_active', true).eq('is_deleted', false).eq('is_paused', false),
        supabase.from('xp_transactions').select('amount, description, created_at, source')
          .eq('member_id', memberId),
        supabase.from('money_transactions').select('amount, type')
          .eq('member_id', memberId).eq('status', 'approved'),
        supabase.from('task_completions').select('task_id, approved')
          .eq('member_id', memberId).gte('completed_at', today),
      ])

      const allXp = allXpResult.data || []
      const xpTransactions = allXp.map(t => ({
        ...t,
        created_at: t.created_at,
      }))

      const recentManual = allXp.find(t => t.source === 'manual' && new Date(t.created_at) >= new Date(fiveMinAgo))

      return NextResponse.json({
        success: true,
        member: { name: memberData.name, current_streak: memberData.current_streak },
        tasks: tasksResult.data || [],
        xp_transactions: xpTransactions,
        xp: allXp.reduce((sum, t) => sum + t.amount, 0),
        money_balance: (moneyResult.data || []).reduce((sum, t) => sum + (t.type === 'earned' ? t.amount : -t.amount), 0),
        completed_today: (completionsResult.data || []).filter(c => c.approved).map(c => c.task_id),
        pending_today: (completionsResult.data || []).filter(c => c.approved === null).map(c => c.task_id),
        recent_manual: recentManual ? {
          type: recentManual.amount > 0 ? 'success' : 'error',
          message: recentManual.amount > 0
            ? `مكافأة من الوالد: ${recentManual.description} (+${recentManual.amount} XP)`
            : `تنبيه من الوالد: ${recentManual.description} (${recentManual.amount} XP)`,
        } : null,
      })
    }

    // 'tasks' — task list scoped to this child
    if (section === 'tasks') {
      const [tasksResult, completionsResult] = await Promise.all([
        supabase.from('tasks').select('id, title, description, xp_reward, money_reward, requires_approval, task_type, quran_action_type, icon, priority, custom_content_text')
          .eq('family_id', familyId).eq('is_active', true).eq('is_deleted', false).eq('is_paused', false)
          .or(`assigned_to.is.null,assigned_to.cs.{${memberId}}`),
        supabase.from('task_completions').select('task_id, approved')
          .eq('member_id', memberId).gte('completed_at', today),
      ])

      const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 }
      const sortedTasks = (tasksResult.data || []).sort((a, b) => (priorityOrder[a.priority || 'medium'] || 1) - (priorityOrder[b.priority || 'medium'] || 1))

      return NextResponse.json({
        success: true,
        member: { name: memberData.name },
        tasks: sortedTasks,
        completed_today: (completionsResult.data || []).filter(c => c.approved === true).map(c => c.task_id),
        pending_today: (completionsResult.data || []).filter(c => c.approved === null).map(c => c.task_id),
      })
    }

    // 'gifts' — active gifts + this child's balances + redemption status
    if (section === 'gifts') {
      const [giftsResult, xpResult, moneyResult, redemptionsResult] = await Promise.all([
        supabase.from('gifts').select('*').eq('family_id', familyId).eq('is_active', true),
        supabase.from('xp_transactions').select('amount').eq('member_id', memberId),
        supabase.from('money_transactions').select('amount, type').eq('member_id', memberId).eq('status', 'approved'),
        supabase.from('gift_redemptions').select('gift_id, status, requested_xp_cost, xp_spent, money_spent, redeemed_at').eq('member_id', memberId),
      ])

      // Build full redemption history per gift for this child
      const allRedemptions = (redemptionsResult.data || [])
      const redemptionsByGift = new Map<string, typeof allRedemptions>()
      for (const r of allRedemptions) {
        const list = redemptionsByGift.get(r.gift_id) || []
        list.push(r)
        redemptionsByGift.set(r.gift_id, list)
      }

      // Sort each gift's history by date descending (newest first)
      for (const list of redemptionsByGift.values()) {
        list.sort((a, b) => new Date(b.redeemed_at).getTime() - new Date(a.redeemed_at).getTime())
      }

      // Enrich gifts with latest status + full history
      const enrichedGifts = (giftsResult.data || []).map((g: any) => {
        const history = redemptionsByGift.get(g.id) || []
        const latest = history[0] || null
        return {
          ...g,
          redemption_status: latest?.status || null,
          redemption_requested_xp: latest?.requested_xp_cost || null,
          redemption_xp_spent: latest?.xp_spent || null,
          redemption_date: latest?.redeemed_at || null,
          redemption_history: history.map((r: any) => ({
            status: r.status,
            requested_xp: r.requested_xp_cost,
            xp_spent: r.xp_spent,
            money_spent: r.money_spent,
            date: r.redeemed_at,
          })),
        }
      })

      return NextResponse.json({
        success: true,
        gifts: enrichedGifts,
        xp: (xpResult.data || []).reduce((sum, t) => sum + t.amount, 0),
        money_balance: (moneyResult.data || []).reduce((sum, t) => sum + (t.type === 'earned' ? t.amount : -t.amount), 0),
      })
    }

    // 'garden' — level/streak data
    if (section === 'garden') {
      const { data: xpData } = await supabase
        .from('xp_transactions')
        .select('amount')
        .eq('member_id', memberId)

      return NextResponse.json({
        success: true,
        member: {
          name: memberData.name,
          current_streak: memberData.current_streak,
          longest_streak: memberData.longest_streak,
          grace_shields: memberData.grace_shields,
          last_active_date: memberData.last_active_date,
        },
        xp: (xpData || []).reduce((sum, t) => sum + t.amount, 0),
      })
    }

    // 'profile' — profile summary
    const [xpResult, tasksResult, completionsResult] = await Promise.all([
      supabase.from('xp_transactions').select('amount').eq('member_id', memberId),
      supabase.from('tasks').select('id').eq('family_id', familyId).eq('is_active', true),
      supabase.from('task_completions').select('id').eq('member_id', memberId),
    ])

    return NextResponse.json({
      success: true,
      member: { name: memberData.name, login_code: memberData.login_code, current_streak: memberData.current_streak },
      xp: (xpResult.data || []).reduce((sum, t) => sum + t.amount, 0),
      total_tasks: tasksResult.data?.length || 0,
      completed_tasks: completionsResult.data?.length || 0,
    })
  } catch (err) {
    console.error('[GHRS CHILD-MODE DATA] Unexpected error:', err)
    return NextResponse.json({ success: false, error: 'حدث خطأ غير متوقع' }, { status: 500 })
  }
}