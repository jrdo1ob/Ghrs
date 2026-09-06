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

    const { name } = await request.json()

    if (typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ success: false, error: 'الاسم لا يمكن أن يكون فارغاً' }, { status: 400 })
    }

    const supabase = createServiceRoleClient()

    // Update the SESSION member only — the target member_id is derived from
    // the validated session, never trusted from the client.
    const { data: member, error } = await supabase
      .from('members')
      .update({ name: name.trim() })
      .eq('id', session.member.member_id)
      .select('id, name, role')
      .single()

    if (error) {
      console.error('[GHRS SETTINGS UPDATE MEMBER] Update error:', error.message)
      return NextResponse.json({ success: false, error: 'حدث خطأ أثناء تحديث الاسم' }, { status: 500 })
    }

    return NextResponse.json({ success: true, member })
  } catch (err) {
    console.error('[GHRS SETTINGS UPDATE MEMBER] Unexpected error:', err)
    return NextResponse.json({ success: false, error: 'حدث خطأ غير متوقع' }, { status: 500 })
  }
}