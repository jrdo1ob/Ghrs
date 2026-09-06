import { NextResponse, type NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { validateRequestAuth, requireParentRole, verifyRecordBelongsToFamily } from '@/lib/auth/server-session'

export async function POST(request: NextRequest) {
  try {
    const session = await validateRequestAuth(request)
    if (!session.success || !session.member) {
      return NextResponse.json({ success: false, error: session.error }, { status: session.status })
    }

    const member = session.member

    const roleCheck = requireParentRole(member)
    if (!roleCheck.ok) {
      return NextResponse.json({ success: false, error: roleCheck.error }, { status: roleCheck.status })
    }

    const { preset_id, assigned_to } = await request.json()
    if (!preset_id) {
      return NextResponse.json({ success: false, error: 'معرّف القصة مطلوب' }, { status: 400 })
    }

    // family_id MUST come from the validated session, never from the browser
    const supabase = createServiceRoleClient()

    // Verify the assigned child/member belongs to this family before assigning
    if (assigned_to) {
      const ownership = await verifyRecordBelongsToFamily(supabase, 'members', assigned_to, member.family_id)
      if (!ownership.ok) {
        return NextResponse.json({ success: false, error: ownership.error }, { status: ownership.status })
      }
    }

    const { data: storyId, error } = await supabase.rpc('add_preset_story', {
      p_preset_id: preset_id,
      p_family_id: member.family_id,
      p_assigned_to: assigned_to || null,
    })

    if (error || !storyId) {
      console.error('[GHRS ADD PRESET STORY] RPC error:', error?.message)
      return NextResponse.json(
        { success: false, error: 'تعذر إضافة القصة، حاول مرة أخرى' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, message: 'تمت إضافة القصة بنجاح', story_id: storyId })
  } catch (err) {
    console.error('[GHRS ADD PRESET STORY] Unexpected error:', err)
    return NextResponse.json({ success: false, error: 'حدث خطأ غير متوقع' }, { status: 500 })
  }
}