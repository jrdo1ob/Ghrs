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

    const { title, content, moral_value, reward_xp, assigned_to } = await request.json()
    if (!title || !content) {
      return NextResponse.json({ success: false, error: 'عنوان القصة ونصها مطلوبان' }, { status: 400 })
    }

    // family_id and created_by MUST come from the validated session, never from the browser
    const supabase = createServiceRoleClient()

    // Verify the assigned child/member belongs to this family before creating
    if (assigned_to) {
      const ownership = await verifyRecordBelongsToFamily(supabase, 'members', assigned_to, member.family_id)
      if (!ownership.ok) {
        return NextResponse.json({ success: false, error: ownership.error }, { status: ownership.status })
      }
    }

    const { data: storyId, error } = await supabase.rpc('create_story', {
      p_family_id: member.family_id,
      p_title: title,
      p_content: content,
      p_moral_value: moral_value || null,
      p_reward_xp: typeof reward_xp === 'number' && reward_xp > 0 ? reward_xp : 5,
      p_assigned_to: assigned_to || null,
    })

    if (error || !storyId) {
      console.error('[GHRS CREATE STORY] RPC error:', error?.message)
      return NextResponse.json(
        { success: false, error: 'تعذر إنشاء القصة، حاول مرة أخرى' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, message: 'تم إنشاء القصة بنجاح', story_id: storyId })
  } catch (err) {
    console.error('[GHRS CREATE STORY] Unexpected error:', err)
    return NextResponse.json({ success: false, error: 'حدث خطأ غير متوقع' }, { status: 500 })
  }
}