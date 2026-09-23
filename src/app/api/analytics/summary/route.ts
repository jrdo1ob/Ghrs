import { NextResponse, type NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { validateRequestAuth, requireParentRole, verifyRecordBelongsToFamily } from '@/lib/auth/server-session'

const MAX_RANGE_DAYS = 365
const DEFAULT_RANGE_DAYS = 30

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

    const body = await request.json().catch(() => ({}))
    const { childId, from, to } = body as {
      childId?: string
      from?: string
      to?: string
    }

    const supabase = createServiceRoleClient()
    const familyId = session.member.family_id

    // If childId is provided, verify it belongs to the parent's family
    if (childId) {
      const ownership = await verifyRecordBelongsToFamily(supabase, 'members', childId, familyId)
      if (!ownership.ok) {
        return NextResponse.json({ success: false, error: ownership.error }, { status: ownership.status })
      }

      // Verify the member is actually a child
      const { data: memberCheck } = await supabase
        .from('members')
        .select('role')
        .eq('id', childId)
        .single()

      if (!memberCheck || memberCheck.role !== 'child') {
        return NextResponse.json({ success: false, error: 'المعرف ليس لطفل' }, { status: 400 })
      }
    }

    // Parse and validate date range
    const now = new Date()
    let toDate: Date
    let fromDate: Date

    if (to) {
      toDate = new Date(to)
      if (isNaN(toDate.getTime())) {
        return NextResponse.json({ success: false, error: 'تاريخ النهاية غير صالح' }, { status: 400 })
      }
    } else {
      toDate = now
    }

    if (from) {
      fromDate = new Date(from)
      if (isNaN(fromDate.getTime())) {
        return NextResponse.json({ success: false, error: 'تاريخ البداية غير صالح' }, { status: 400 })
      }
    } else {
      fromDate = new Date(toDate)
      fromDate.setDate(fromDate.getDate() - DEFAULT_RANGE_DAYS)
    }

    // Enforce maximum range limit
    const rangeMs = toDate.getTime() - fromDate.getTime()
    const rangeDays = rangeMs / (1000 * 60 * 60 * 24)
    if (rangeDays > MAX_RANGE_DAYS) {
      return NextResponse.json(
        { success: false, error: `الحد الأقصى لنطاق التاريخ هو ${MAX_RANGE_DAYS} يوم` },
        { status: 400 }
      )
    }

    if (fromDate > toDate) {
      return NextResponse.json(
        { success: false, error: 'تاريخ البداية يجب أن يكون قبل تاريخ النهاية' },
        { status: 400 }
      )
    }

    const fromIso = fromDate.toISOString()
    const toIso = toDate.toISOString()

    // Get children in this family
    const childQuery = supabase
      .from('members')
      .select('id, name')
      .eq('family_id', familyId)
      .eq('role', 'child')
      .eq('is_deleted', false)
      .order('created_at', { ascending: true })

    if (childId) {
      childQuery.eq('id', childId)
    }

    const { data: children, error: childrenError } = await childQuery

    if (childrenError) {
      console.error('[GHRS ANALYTICS SUMMARY] Children query error:', childrenError)
      return NextResponse.json({ success: false, error: 'حدث خطأ' }, { status: 500 })
    }

    const childList = children || []
    const childIds = childList.map((c: { id: string }) => c.id)

    if (childIds.length === 0) {
      return NextResponse.json({
        success: true,
        children: [],
        period: { from: fromIso, to: toIso },
      })
    }

    // Fetch XP transactions for all children in the date range
    const { data: xpData } = await supabase
      .from('xp_transactions')
      .select('member_id, amount, source')
      .in('member_id', childIds)
      .gte('created_at', fromIso)
      .lte('created_at', toIso)

    // Fetch approved money transactions (earned only) for the date range
    const { data: moneyData } = await supabase
      .from('money_transactions')
      .select('member_id, amount, type')
      .in('member_id', childIds)
      .eq('status', 'approved')
      .eq('type', 'earned')
      .gte('created_at', fromIso)
      .lte('created_at', toIso)

    // Fetch task completions for the date range
    const { data: completionsData } = await supabase
      .from('task_completions')
      .select('member_id, approved')
      .in('member_id', childIds)
      .gte('completed_at', fromIso)
      .lte('completed_at', toIso)

    // Aggregate per-child
    const xpByChild: Record<string, number> = {}
    const moneyByChild: Record<string, number> = {}
    const completedByChild: Record<string, number> = {}
    const approvedByChild: Record<string, number> = {}

    for (const t of xpData || []) {
      xpByChild[t.member_id] = (xpByChild[t.member_id] || 0) + t.amount
    }

    for (const t of moneyData || []) {
      moneyByChild[t.member_id] = (moneyByChild[t.member_id] || 0) + t.amount
    }

    for (const c of completionsData || []) {
      completedByChild[c.member_id] = (completedByChild[c.member_id] || 0) + 1
      if (c.approved === true) {
        approvedByChild[c.member_id] = (approvedByChild[c.member_id] || 0) + 1
      }
    }

    const enrichedChildren = childList.map((child: { id: string; name: string }) => ({
      childId: child.id,
      name: child.name,
      xp_earned: xpByChild[child.id] || 0,
      money_earned: moneyByChild[child.id] || 0,
      tasks_completed: completedByChild[child.id] || 0,
      tasks_approved: approvedByChild[child.id] || 0,
    }))

    return NextResponse.json({
      success: true,
      children: enrichedChildren,
      period: { from: fromIso, to: toIso },
    })
  } catch (err) {
    console.error('[GHRS ANALYTICS SUMMARY] Unexpected error:', err)
    return NextResponse.json({ success: false, error: 'حدث خطأ غير متوقع' }, { status: 500 })
  }
}
