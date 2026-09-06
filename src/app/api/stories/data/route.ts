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

    const [childrenResult, storiesResult] = await Promise.all([
      supabase
        .from('members')
        .select('id, name')
        .eq('family_id', familyId)
        .eq('role', 'child')
        .eq('is_deleted', false),
      supabase
        .from('stories')
        .select('*')
        .eq('family_id', familyId)
        .order('created_at', { ascending: false }),
    ])

    return NextResponse.json({
      success: true,
      children: childrenResult.data || [],
      stories: storiesResult.data || [],
    })
  } catch (err) {
    console.error('[GHRS STORIES DATA] Unexpected error:', err)
    return NextResponse.json({ success: false, error: 'حدث خطأ غير متوقع' }, { status: 500 })
  }
}