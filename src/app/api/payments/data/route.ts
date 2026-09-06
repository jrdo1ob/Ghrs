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

    const { data: membersData } = await supabase
      .from('members')
      .select('id')
      .eq('family_id', familyId)

    const memberIds = (membersData || []).map(m => m.id)

    let transactions: any[] = []
    if (memberIds.length > 0) {
      const { data: transactionsData } = await supabase
        .from('money_transactions')
        .select('*')
        .in('member_id', memberIds)
        .order('created_at', { ascending: false })
      transactions = transactionsData || []
    }

    return NextResponse.json({
      success: true,
      transactions,
    })
  } catch (err) {
    console.error('[GHRS PAYMENTS DATA] Unexpected error:', err)
    return NextResponse.json({ success: false, error: 'حدث خطأ غير متوقع' }, { status: 500 })
  }
}