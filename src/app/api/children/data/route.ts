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

    const [familyResult, childrenResult, parentsResult] = await Promise.all([
      supabase.from('families').select('name, code').eq('id', familyId).single(),
      supabase.from('members').select('id, name, role, login_code').eq('family_id', familyId).eq('role', 'child').order('created_at', { ascending: true }),
      supabase.from('members').select('id, name, role, login_code').eq('family_id', familyId).in('role', ['parent', 'owner']).order('created_at', { ascending: true }),
    ])

    return NextResponse.json({
      success: true,
      family: familyResult.data,
      children: childrenResult.data || [],
      parents: parentsResult.data || [],
    })
  } catch (err) {
    console.error('[GHRS CHILDREN DATA] Unexpected error:', err)
    return NextResponse.json({ success: false, error: 'حدث خطأ غير متوقع' }, { status: 500 })
  }
}