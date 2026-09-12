import { NextResponse, type NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { validateSession, requireParentRole } from '@/lib/auth/server-session'

export async function POST(request: NextRequest) {
  try {
    const session = await validateSession(request)
    if (!session.success || !session.member) {
      return NextResponse.json({ success: false, error: session.error }, { status: session.status })
    }

    const member = session.member

    const { section = 'pending' } = await request.json()

    const supabase = createServiceRoleClient()

    if (section === 'pending') {
      // Parent view: pending gift redemptions for their family
      const roleCheck = requireParentRole(member)
      if (!roleCheck.ok) {
        return NextResponse.json({ success: false, error: roleCheck.error }, { status: roleCheck.status })
      }

      const { data: redemptions, error } = await supabase
        .from('gift_redemptions')
        .select('id, gift_id, member_id, requested_xp_cost, status, redeemed_at')
        .eq('status', 'pending')

      if (error) {
        return NextResponse.json({ success: false, error: 'حدث خطأ' }, { status: 500 })
      }

      // Enrich with gift and child names
      const enriched = await Promise.all(
        (redemptions || []).map(async (r) => {
          const [giftData, memberData] = await Promise.all([
            supabase.from('gifts').select('title, family_id').eq('id', r.gift_id).single(),
            supabase.from('members').select('name, family_id').eq('id', r.member_id).single(),
          ])
          return {
            ...r,
            gift_title: giftData.data?.title || 'هدية',
            child_name: memberData.data?.name || 'طفل',
            family_id: memberData.data?.family_id,
          }
        })
      )

      // Filter to only show requests belonging to the parent's family
      const familyRequests = enriched.filter(r => r.family_id === member.family_id)

      return NextResponse.json({
        success: true,
        pending_redemptions: familyRequests,
      })
    }

    return NextResponse.json({ success: false, error: 'قسم غير معروف' }, { status: 400 })
  } catch (err) {
    console.error('[GHRS GIFTS DATA] Unexpected error:', err)
    return NextResponse.json({ success: false, error: 'حدث خطأ غير متوقع' }, { status: 500 })
  }
}
