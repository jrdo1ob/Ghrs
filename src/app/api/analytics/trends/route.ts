import { NextResponse, type NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { validateRequestAuth, requireParentRole, verifyRecordBelongsToFamily } from '@/lib/auth/server-session'

const MAX_RANGE_DAYS = 365
const DEFAULT_RANGE_DAYS = 30
type Granularity = 'day' | 'week'

/**
 * Normalize a Date to UTC midnight (start of day).
 */
function toUtcDayStart(d: Date): Date {
  const r = new Date(d)
  r.setUTCHours(0, 0, 0, 0)
  return r
}

/**
 * Return the Monday of the ISO week containing `d`.
 * ISO 8601: Monday = 1, Sunday = 7.
 */
function toUtcWeekStart(d: Date): Date {
  const day = toUtcDayStart(d)
  const dow = day.getUTCDay() || 7 // 0 (Sun) → 7
  day.setUTCDate(day.getUTCDate() - (dow - 1))
  return day
}

/**
 * Format a Date as YYYY-MM-DD (UTC).
 */
function fmtDate(d: Date): string {
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

/**
 * Advance a bucket key by one unit (day or week).
 */
function advanceBucket(key: string, granularity: Granularity): string {
  const d = new Date(key + 'T00:00:00Z')
  if (granularity === 'day') {
    d.setUTCDate(d.getUTCDate() + 1)
  } else {
    d.setUTCDate(d.getUTCDate() + 7)
  }
  return fmtDate(d)
}

/**
 * Generate all bucket keys from `from` to `to` inclusive.
 * `from` and `to` are already normalized to bucket starts.
 */
function generateBuckets(from: Date, to: Date, granularity: Granularity): string[] {
  const buckets: string[] = []
  let cur = toUtcDayStart(from)
  const end = toUtcDayStart(to)
  while (cur <= end) {
    buckets.push(fmtDate(cur))
    cur = new Date(advanceBucket(fmtDate(cur), granularity) + 'T00:00:00Z')
  }
  return buckets
}

/**
 * Map a timestamp string to its bucket key for the given granularity.
 */
function bucketKey(iso: string, granularity: Granularity): string {
  const d = new Date(iso)
  if (granularity === 'week') {
    return fmtDate(toUtcWeekStart(d))
  }
  return fmtDate(toUtcDayStart(d))
}

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
    const { childId, from, to, granularity } = body as {
      childId?: string
      from?: string
      to?: string
      granularity?: string
    }

    const supabase = createServiceRoleClient()
    const familyId = session.member.family_id

    // Validate granularity
    const gran: Granularity = granularity === 'week' ? 'week' : 'day'

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

    // Normalize to bucket boundaries for query range
    const queryFrom = toUtcDayStart(fromDate).toISOString()
    const queryTo = toDate.toISOString()

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
      console.error('[GHRS ANALYTICS TRENDS] Children query error:', childrenError)
      return NextResponse.json({ success: false, error: 'حدث خطأ' }, { status: 500 })
    }

    const childList = children || []
    const childIds = childList.map((c: { id: string }) => c.id)

    if (childIds.length === 0) {
      return NextResponse.json({
        success: true,
        children: [],
        period: { from: queryFrom, to: queryTo },
        granularity: gran,
      })
    }

    // Fetch XP transactions for all children in the date range
    const { data: xpData } = await supabase
      .from('xp_transactions')
      .select('member_id, amount, created_at')
      .in('member_id', childIds)
      .gte('created_at', queryFrom)
      .lte('created_at', queryTo)

    // Fetch approved money transactions (earned only) for the date range
    const { data: moneyData } = await supabase
      .from('money_transactions')
      .select('member_id, amount, created_at')
      .in('member_id', childIds)
      .eq('status', 'approved')
      .eq('type', 'earned')
      .gte('created_at', queryFrom)
      .lte('created_at', queryTo)

    // Fetch task completions for the date range
    const { data: completionsData } = await supabase
      .from('task_completions')
      .select('member_id, approved, completed_at')
      .in('member_id', childIds)
      .gte('completed_at', queryFrom)
      .lte('completed_at', queryTo)

    // Generate all bucket keys for the requested range
    const allBuckets = generateBuckets(toUtcDayStart(fromDate), toUtcDayStart(toDate), gran)

    // Aggregate per-child per-bucket
    const xpEarnedByChild: Record<string, Record<string, number>> = {}
    const xpDeductionsByChild: Record<string, Record<string, number>> = {}
    const moneyByChild: Record<string, Record<string, number>> = {}
    const completedByChild: Record<string, Record<string, number>> = {}
    const approvedByChild: Record<string, Record<string, number>> = {}

    for (const cid of childIds) {
      xpEarnedByChild[cid] = {}
      xpDeductionsByChild[cid] = {}
      moneyByChild[cid] = {}
      completedByChild[cid] = {}
      approvedByChild[cid] = {}
    }

    for (const t of xpData || []) {
      const bucket = bucketKey(t.created_at, gran)
      const memberId = t.member_id
      if (t.amount > 0) {
        xpEarnedByChild[memberId][bucket] = (xpEarnedByChild[memberId][bucket] || 0) + t.amount
      } else if (t.amount < 0) {
        xpDeductionsByChild[memberId][bucket] = (xpDeductionsByChild[memberId][bucket] || 0) + Math.abs(t.amount)
      }
    }

    for (const t of moneyData || []) {
      const bucket = bucketKey(t.created_at, gran)
      moneyByChild[t.member_id][bucket] = (moneyByChild[t.member_id][bucket] || 0) + t.amount
    }

    for (const c of completionsData || []) {
      const bucket = bucketKey(c.completed_at, gran)
      completedByChild[c.member_id][bucket] = (completedByChild[c.member_id][bucket] || 0) + 1
      if (c.approved === true) {
        approvedByChild[c.member_id][bucket] = (approvedByChild[c.member_id][bucket] || 0) + 1
      }
    }

    // Build response with zero-filled buckets
    const enrichedChildren = childList.map((child: { id: string; name: string }) => {
      const trends = allBuckets.map((bucket) => ({
        bucket,
        xp_earned: xpEarnedByChild[child.id][bucket] || 0,
        xp_deductions: xpDeductionsByChild[child.id][bucket] || 0,
        money_earned: moneyByChild[child.id][bucket] || 0,
        tasks_completed: completedByChild[child.id][bucket] || 0,
        tasks_approved: approvedByChild[child.id][bucket] || 0,
      }))

      return {
        childId: child.id,
        name: child.name,
        trends,
      }
    })

    return NextResponse.json({
      success: true,
      children: enrichedChildren,
      period: { from: queryFrom, to: queryTo },
      granularity: gran,
    })
  } catch (err) {
    console.error('[GHRS ANALYTICS TRENDS] Unexpected error:', err)
    return NextResponse.json({ success: false, error: 'حدث خطأ غير متوقع' }, { status: 500 })
  }
}
