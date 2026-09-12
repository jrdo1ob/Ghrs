import { NextResponse, type NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { validateSession } from '@/lib/auth/server-session'

interface ActivityEvent {
  id: string
  type: 'completed' | 'approved' | 'rejected' | 'revoked'
  child_name: string
  task_title: string
  xp_amount: number
  money_amount: number
  performed_by: string | null
  timestamp: string
  description: string | null
  completion_id: string | null
  approved: boolean | null
  is_gift: boolean
}

export async function POST(request: NextRequest) {
  try {
    const session = await validateSession(request)
    if (!session.success || !session.member) {
      return NextResponse.json({ success: false, error: session.error }, { status: session.status })
    }

    const member = session.member

    if (member.member_role !== 'parent' && member.member_role !== 'owner') {
      return NextResponse.json({ success: false, error: 'هذه العملية مخصصة للوالدين فقط' }, { status: 403 })
    }

    const { child_filter = 'all', type_filter = 'all' } = await request.json()

    const supabase = createServiceRoleClient()

    // Family children list (used by the page for the filter dropdown)
    const { data: familyChildren } = await supabase
      .from('members')
      .select('id, name')
      .eq('family_id', member.family_id)
      .eq('role', 'child')
      .eq('is_deleted', false)
      .order('created_at', { ascending: true })

    // Step 1: Get family's tasks
    const { data: familyTasks } = await supabase
      .from('tasks')
      .select('id, title')
      .eq('family_id', member.family_id)

    if (!familyTasks || familyTasks.length === 0) {
      return NextResponse.json({ success: true, events: [], children: familyChildren || [] })
    }

    const taskIds = familyTasks.map(t => t.id)

    // Step 2: Get completions for ONLY these tasks (family-scoped)
    let completionsQuery = supabase
      .from('task_completions')
      .select('id, task_id, member_id, approved, completed_at, rejected_by, rejected_at')
      .in('task_id', taskIds)
      .order('completed_at', { ascending: false })
      .limit(100)

    const { data: completions } = await completionsQuery

    if (!completions || completions.length === 0) {
      return NextResponse.json({ success: true, events: [], children: familyChildren || [] })
    }

    // Step 3: Collect IDs for batch queries
    const memberIds = [...new Set(completions.map(c => c.member_id))]
    const completionIds = completions.map(c => c.id)

    const taskTitleById = new Map(familyTasks.map(t => [t.id, t.title]))

    const { data: members } = await supabase
      .from('members')
      .select('id, name')
      .in('id', memberIds)

    const memberNameById = new Map((members || []).map(m => [m.id, m.name]))

    const { data: allHistories } = await supabase
      .from('task_approval_history')
      .select('completion_id, action, performed_by, created_at')
      .in('completion_id', completionIds)
      .order('created_at', { ascending: false })

    const performerIds = [...new Set(
      (allHistories || []).map(h => h.performed_by).filter((id): id is string => id !== null)
    )]

    const { data: performers } = performerIds.length > 0
      ? await supabase.from('members').select('id, name').in('id', performerIds)
      : { data: [] }

    const performerNameById = new Map((performers || []).map(p => [p.id, p.name]))

    const latestHistoryByCompletion = new Map<string, { completion_id: string; action: string; performed_by: string | null; created_at: string }>()
    for (const h of allHistories || []) {
      if (!latestHistoryByCompletion.has(h.completion_id)) {
        latestHistoryByCompletion.set(h.completion_id, h)
      }
    }

    // Assemble events
    const events: ActivityEvent[] = []

    for (const c of completions) {
      const member = memberNameById.get(c.member_id)
      if (!member) continue
      if (child_filter !== 'all' && c.member_id !== child_filter) continue

      const latestHistory = latestHistoryByCompletion.get(c.id)
      const eventType = (latestHistory?.action === 'revoke' || latestHistory?.action === 'revoked')
        ? 'revoked'
        : (latestHistory?.action || 'completed')

      const isAdmin = eventType === 'approved' || eventType === 'rejected' || eventType === 'revoked'
      const performer = isAdmin && latestHistory?.performed_by
        ? performerNameById.get(latestHistory.performed_by)
        : null

      let shouldInclude = true
      if (type_filter !== 'all') {
        if (type_filter === 'completed') {
          shouldInclude = (c.approved === null)
        } else if (type_filter === 'approved') {
          shouldInclude = (c.approved === true)
        } else if (type_filter === 'rejected') {
          shouldInclude = (c.approved === false)
        } else if (type_filter === 'revoked') {
          shouldInclude = (latestHistory?.action === 'revoked')
        } else {
          shouldInclude = (type_filter === (c.approved === null ? 'pending' : c.approved === true ? 'approved' : 'rejected'))
        }
      }
      if (!shouldInclude) continue

      events.push({
        id: `comp-${c.id}`,
        type: eventType as ActivityEvent['type'],
        child_name: member,
        task_title: taskTitleById.get(c.task_id) || '',
        xp_amount: 0,
        money_amount: 0,
        performed_by: performer || null,
        timestamp: latestHistory?.created_at || c.completed_at,
        description: null,
        completion_id: c.id,
        approved: c.approved,
        is_gift: false,
      })
    }

    // Step 4: Get gift activity events
    const { data: giftActivities } = await supabase
      .from('gift_activity')
      .select('id, gift_redemption_id, action, performed_by, xp_amount, money_amount, reason, created_at')
      .order('created_at', { ascending: false })
      .limit(100)

    // Get gift redemption details for gift activities
    const giftRedemptionIds = (giftActivities || []).map(g => g.gift_redemption_id)
    const { data: giftRedemptions } = giftRedemptionIds.length > 0
      ? await supabase.from('gift_redemptions').select('id, gift_id, member_id').in('id', giftRedemptionIds)
      : { data: [] }

    const giftRedemptionMap = new Map((giftRedemptions || []).map(r => [r.id, r]))

    const giftIds = [...new Set((giftRedemptions || []).map(r => r.gift_id))]
    const { data: gifts } = giftIds.length > 0
      ? await supabase.from('gifts').select('id, title').in('id', giftIds)
      : { data: [] }
    const giftTitleById = new Map((gifts || []).map(g => [g.id, g.title]))

    const giftMemberIds = [...new Set((giftRedemptions || []).map(r => r.member_id))]
    const { data: giftMembers } = giftMemberIds.length > 0
      ? await supabase.from('members').select('id, name').in('id', giftMemberIds)
      : { data: [] }
    const giftMemberNameById = new Map((giftMembers || []).map(m => [m.id, m.name]))

    const giftPerformerIds = [...new Set(
      (giftActivities || []).map(g => g.performed_by).filter((id): id is string => id !== null)
    )]
    const { data: giftPerformers } = giftPerformerIds.length > 0
      ? await supabase.from('members').select('id, name').in('id', giftPerformerIds)
      : { data: [] }
    const giftPerformerNameById = new Map((giftPerformers || []).map(p => [p.id, p.name]))

    // Assemble gift events
    for (const ga of giftActivities || []) {
      const redemption = giftRedemptionMap.get(ga.gift_redemption_id)
      if (!redemption) continue

      const childName = giftMemberNameById.get(redemption.member_id) || 'طفل'
      const giftTitle = giftTitleById.get(redemption.gift_id) || 'هدية'
      const performer = ga.performed_by ? giftPerformerNameById.get(ga.performed_by) : null

      // Apply filters
      if (child_filter !== 'all' && redemption.member_id !== child_filter) continue
      if (type_filter !== 'all' && type_filter !== ga.action) continue

      events.push({
        id: `gift-${ga.id}`,
        type: ga.action as ActivityEvent['type'],
        child_name: childName,
        task_title: giftTitle,
        xp_amount: ga.xp_amount || 0,
        money_amount: ga.money_amount || 0,
        performed_by: performer || null,
        timestamp: ga.created_at,
        description: ga.reason || null,
        completion_id: ga.gift_redemption_id,
        approved: ga.action === 'approved' ? true : ga.action === 'rejected' ? false : null,
        is_gift: true,
      })
    }

    events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    return NextResponse.json({ success: true, events, children: familyChildren || [] })
  } catch (err) {
    console.error('[GHRS ACTIVITY EVENTS] Unexpected error:', err)
    return NextResponse.json({ success: false, error: 'حدث خطأ غير متوقع' }, { status: 500 })
  }
}
