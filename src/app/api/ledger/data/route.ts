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

    const { child_id = 'all' } = await request.json()

    const { data: membersData } = await supabase
      .from('members')
      .select('id, name, role')
      .eq('family_id', familyId)
      .order('created_at', { ascending: true })

    const allMembers = membersData || []

    // Resolve which children to scope the ledger to
    let childIds: string[] = []
    if (child_id === 'all') {
      childIds = allMembers.filter(m => m.role === 'child').map(c => c.id)
    } else {
      const target = allMembers.find(m => m.id === child_id)
      if (!target) {
        return NextResponse.json({ success: false, error: 'الطفل غير موجود في هذه العائلة' }, { status: 404 })
      }
      childIds = [child_id]
    }

    if (childIds.length === 0) {
      return NextResponse.json({ success: true, members: allMembers, xp_transactions: [], money_transactions: [] })
    }

    const [xpResult, moneyResult] = await Promise.all([
      supabase.from('xp_transactions').select('*').in('member_id', childIds).order('created_at', { ascending: false }).limit(100),
      supabase.from('money_transactions').select('*').in('member_id', childIds).order('created_at', { ascending: false }).limit(100),
    ])

    return NextResponse.json({
      success: true,
      members: allMembers,
      xp_transactions: xpResult.data || [],
      money_transactions: moneyResult.data || [],
    })
  } catch (err) {
    console.error('[GHRS LEDGER DATA] Unexpected error:', err)
    return NextResponse.json({ success: false, error: 'حدث خطأ غير متوقع' }, { status: 500 })
  }
}